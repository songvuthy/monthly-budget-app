import { nanoid } from "nanoid";
import { getClient } from "@/lib/turso";

export type Category = {
  id: string;
  name: string;
  color: string; // hex, used for the ledger tick color
  parentId: string | null; // null = top-level category
};

export type Transaction = {
  id: string;
  date: string; // ISO date, yyyy-mm-dd
  amount: number; // always positive; sign comes from `type`
  type: "income" | "expense";
  categoryId: string;
  note: string;
};

export type Budget = {
  categoryId: string;
  monthlyLimit: number;
};

// Palette: one color per top-level category. Sub-categories inherit their
// parent's color so the register/dashboard visually groups them together.
const HOME = "#8C6D46";
const BABY = "#7A5C7E";

const seedCategories: Category[] = [
  { id: "cat_income", name: "Income", color: "#3F6B4D", parentId: null },

  { id: "cat_home", name: "Home", color: HOME, parentId: null },
  { id: "cat_home_rent", name: "Rent", color: HOME, parentId: "cat_home" },
  { id: "cat_home_electricity", name: "Electricity", color: HOME, parentId: "cat_home" },
  { id: "cat_home_water", name: "Water", color: HOME, parentId: "cat_home" },
  { id: "cat_home_other", name: "Other", color: HOME, parentId: "cat_home" },

  { id: "cat_baby", name: "Baby", color: BABY, parentId: null },
  { id: "cat_baby_milk", name: "Milk", color: BABY, parentId: "cat_baby" },
  { id: "cat_baby_diapers", name: "Diapers", color: BABY, parentId: "cat_baby" },
  { id: "cat_baby_wetpaper", name: "Wet paper", color: BABY, parentId: "cat_baby" },
  { id: "cat_baby_food", name: "Food", color: BABY, parentId: "cat_baby" },
  { id: "cat_baby_clothes", name: "Clothes", color: BABY, parentId: "cat_baby" },
  { id: "cat_baby_medical", name: "Medical", color: BABY, parentId: "cat_baby" },
  { id: "cat_baby_bottle", name: "Bottle", color: BABY, parentId: "cat_baby" },
  { id: "cat_baby_other", name: "Other", color: BABY, parentId: "cat_baby" },

  { id: "cat_car", name: "Car", color: "#6B7A94", parentId: null },
  { id: "cat_food", name: "Food", color: "#A6642C", parentId: null },
  { id: "cat_wifi", name: "Wi-Fi", color: "#4A7C82", parentId: null },
  { id: "cat_weekly", name: "Weekly", color: "#B8935B", parentId: null },
  { id: "cat_saving_target", name: "Saving Target", color: "#6E7B3F", parentId: null },
  { id: "cat_allowance", name: "Allowance", color: "#9C5B5B", parentId: null },
];

const seedBudgets: Budget[] = [
  { categoryId: "cat_home_rent", monthlyLimit: 800 },
  { categoryId: "cat_home_electricity", monthlyLimit: 60 },
  { categoryId: "cat_home_water", monthlyLimit: 30 },
  { categoryId: "cat_baby_milk", monthlyLimit: 60 },
  { categoryId: "cat_baby_diapers", monthlyLimit: 40 },
  { categoryId: "cat_car", monthlyLimit: 150 },
  { categoryId: "cat_food", monthlyLimit: 300 },
  { categoryId: "cat_wifi", monthlyLimit: 40 },
  { categoryId: "cat_allowance", monthlyLimit: 100 },
  { categoryId: "cat_saving_target", monthlyLimit: 200 },
];

let readyPromise: Promise<void> | null = null;

// Creates the tables (if they don't exist yet) and seeds starter categories
// and budgets (if the categories table is empty). Runs once per server
// instance/cold start.
async function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const db = getClient();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          parent_id TEXT
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          category_id TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT ''
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS budgets (
          category_id TEXT PRIMARY KEY,
          monthly_limit REAL NOT NULL
        )
      `);

      const countResult = await db.execute("SELECT COUNT(*) as count FROM categories");
      const count = Number(countResult.rows[0]?.count ?? 0);
      if (count === 0) {
        for (const c of seedCategories) {
          await db.execute({
            sql: "INSERT INTO categories (id, name, color, parent_id) VALUES (?, ?, ?, ?)",
            args: [c.id, c.name, c.color, c.parentId],
          });
        }
        for (const b of seedBudgets) {
          await db.execute({
            sql: "INSERT INTO budgets (category_id, monthly_limit) VALUES (?, ?)",
            args: [b.categoryId, b.monthlyLimit],
          });
        }
      }
    })();
  }
  return readyPromise;
}

export async function listCategories(): Promise<Category[]> {
  await ensureReady();
  const db = getClient();
  const result = await db.execute("SELECT id, name, color, parent_id FROM categories");
  return result.rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    color: String(r.color),
    parentId: r.parent_id === null ? null : String(r.parent_id),
  }));
}

export async function addCategory(input: {
  name: string;
  color: string;
  parentId?: string | null;
}): Promise<Category> {
  await ensureReady();
  const db = getClient();
  const id = `cat_${nanoid(8)}`;
  const parentId = input.parentId ?? null;
  await db.execute({
    sql: "INSERT INTO categories (id, name, color, parent_id) VALUES (?, ?, ?, ?)",
    args: [id, input.name, input.color, parentId],
  });
  return { id, name: input.name, color: input.color, parentId };
}

export async function updateCategory(
  id: string,
  input: { name?: string; color?: string; parentId?: string | null }
): Promise<Category | null> {
  await ensureReady();
  const db = getClient();

  const existing = await db.execute({
    sql: "SELECT id, name, color, parent_id FROM categories WHERE id = ?",
    args: [id],
  });
  if (existing.rows.length === 0) return null;

  const current = existing.rows[0];
  const name = input.name ?? String(current.name);
  const color = input.color ?? String(current.color);
  const parentId = "parentId" in input ? input.parentId ?? null : (current.parent_id as string | null);

  await db.execute({
    sql: "UPDATE categories SET name = ?, color = ?, parent_id = ? WHERE id = ?",
    args: [name, color, parentId, id],
  });

  return { id, name, color, parentId };
}

export async function listTransactions(filter?: {
  from?: string;
  to?: string;
}): Promise<Transaction[]> {
  await ensureReady();
  const db = getClient();

  const conditions: string[] = [];
  const args: string[] = [];
  if (filter?.from) {
    conditions.push("date >= ?");
    args.push(filter.from);
  }
  if (filter?.to) {
    conditions.push("date <= ?");
    args.push(filter.to);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.execute({
    sql: `SELECT id, date, amount, type, category_id, note FROM transactions ${where} ORDER BY date DESC`,
    args,
  });

  return result.rows.map((r) => ({
    id: String(r.id),
    date: String(r.date),
    amount: Number(r.amount),
    type: r.type === "income" ? "income" : "expense",
    categoryId: String(r.category_id),
    note: String(r.note ?? ""),
  }));
}

export async function addTransaction(input: Omit<Transaction, "id">): Promise<Transaction> {
  await ensureReady();
  const db = getClient();
  const id = nanoid(8);
  await db.execute({
    sql: "INSERT INTO transactions (id, date, amount, type, category_id, note) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, input.date, input.amount, input.type, input.categoryId, input.note],
  });
  return { id, ...input };
}

export async function deleteTransaction(id: string): Promise<void> {
  await ensureReady();
  const db = getClient();
  await db.execute({ sql: "DELETE FROM transactions WHERE id = ?", args: [id] });
}

export async function listBudgets(): Promise<Budget[]> {
  await ensureReady();
  const db = getClient();
  const result = await db.execute("SELECT category_id, monthly_limit FROM budgets");
  return result.rows.map((r) => ({
    categoryId: String(r.category_id),
    monthlyLimit: Number(r.monthly_limit),
  }));
}

export async function setBudget(categoryId: string, monthlyLimit: number): Promise<void> {
  await ensureReady();
  const db = getClient();
  await db.execute({
    sql: `
      INSERT INTO budgets (category_id, monthly_limit) VALUES (?, ?)
      ON CONFLICT(category_id) DO UPDATE SET monthly_limit = excluded.monthly_limit
    `,
    args: [categoryId, monthlyLimit],
  });
}
