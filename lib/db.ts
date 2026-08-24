import { JSONFilePreset } from "lowdb/node";
import { nanoid } from "nanoid";
import path from "path";

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

type Data = {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
};

// Palette: one color per top-level category. Sub-categories inherit their
// parent's color so the register/dashboard visually groups them together.
const HOME = "#8C6D46";
const BABY = "#7A5C7E";

const defaultData: Data = {
  categories: [
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
  ],
  transactions: [],
  budgets: [
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
  ],
};

const file = path.join(process.cwd(), "data", "budget.json");

let dbPromise: ReturnType<typeof JSONFilePreset<Data>> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = JSONFilePreset<Data>(file, defaultData);
  }
  return dbPromise;
}

export async function listCategories() {
  const db = await getDb();
  return db.data.categories;
}

export async function addCategory(input: {
  name: string;
  color: string;
  parentId?: string | null;
}) {
  const db = await getDb();
  const record: Category = {
    id: `cat_${nanoid(8)}`,
    name: input.name,
    color: input.color,
    parentId: input.parentId ?? null,
  };
  db.data.categories.push(record);
  await db.write();
  return record;
}

export async function updateCategory(
  id: string,
  input: { name?: string; color?: string; parentId?: string | null }
) {
  const db = await getDb();
  const existing = db.data.categories.find((c) => c.id === id);
  if (!existing) return null;
  if (input.name !== undefined) existing.name = input.name;
  if (input.color !== undefined) existing.color = input.color;
  if ("parentId" in input) existing.parentId = input.parentId ?? null;
  await db.write();
  return existing;
}

export async function listTransactions(filter?: { from?: string; to?: string }) {
  const db = await getDb();
  let rows = [...db.data.transactions];
  if (filter?.from) rows = rows.filter((t) => t.date >= filter.from!);
  if (filter?.to) rows = rows.filter((t) => t.date <= filter.to!);
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addTransaction(input: Omit<Transaction, "id">) {
  const db = await getDb();
  const record: Transaction = { id: nanoid(8), ...input };
  db.data.transactions.push(record);
  await db.write();
  return record;
}

export async function deleteTransaction(id: string) {
  const db = await getDb();
  db.data.transactions = db.data.transactions.filter((t) => t.id !== id);
  await db.write();
}

export async function listBudgets() {
  const db = await getDb();
  return db.data.budgets;
}

export async function setBudget(categoryId: string, monthlyLimit: number) {
  const db = await getDb();
  const existing = db.data.budgets.find((b) => b.categoryId === categoryId);
  if (existing) {
    existing.monthlyLimit = monthlyLimit;
  } else {
    db.data.budgets.push({ categoryId, monthlyLimit });
  }
  await db.write();
}
