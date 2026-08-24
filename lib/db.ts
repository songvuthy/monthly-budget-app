import { getDb } from "@/lib/firebaseAdmin";

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

let seedCheckDone = false;

// Runs once per server instance: if the categories collection is empty
// (brand-new Firebase project), populate it with the starter category tree
// and starter budgets so the app isn't blank on first load.
async function ensureSeeded() {
  if (seedCheckDone) return;
  const db = getDb();
  const snap = await db.collection("categories").limit(1).get();
  if (snap.empty) {
    const batch = db.batch();
    for (const c of seedCategories) {
      const { id, ...rest } = c;
      batch.set(db.collection("categories").doc(id), rest);
    }
    for (const b of seedBudgets) {
      batch.set(db.collection("budgets").doc(b.categoryId), { monthlyLimit: b.monthlyLimit });
    }
    await batch.commit();
  }
  seedCheckDone = true;
}

export async function listCategories(): Promise<Category[]> {
  await ensureSeeded();
  const db = getDb();
  const snap = await db.collection("categories").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Category, "id">) }));
}

export async function addCategory(input: {
  name: string;
  color: string;
  parentId?: string | null;
}): Promise<Category> {
  const db = getDb();
  const data = { name: input.name, color: input.color, parentId: input.parentId ?? null };
  const ref = await db.collection("categories").add(data);
  return { id: ref.id, ...data };
}

export async function updateCategory(
  id: string,
  input: { name?: string; color?: string; parentId?: string | null }
): Promise<Category | null> {
  const db = getDb();
  const ref = db.collection("categories").doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.color !== undefined) updates.color = input.color;
  if ("parentId" in input) updates.parentId = input.parentId ?? null;

  await ref.update(updates);
  const updated = await ref.get();
  return { id: updated.id, ...(updated.data() as Omit<Category, "id">) };
}

export async function listTransactions(filter?: {
  from?: string;
  to?: string;
}): Promise<Transaction[]> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection("transactions");
  if (filter?.from) query = query.where("date", ">=", filter.from);
  if (filter?.to) query = query.where("date", "<=", filter.to);
  query = query.orderBy("date", "desc");

  const snap = await query.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Transaction, "id">) }));
}

export async function addTransaction(input: Omit<Transaction, "id">): Promise<Transaction> {
  const db = getDb();
  const ref = await db.collection("transactions").add(input);
  return { id: ref.id, ...input };
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = getDb();
  await db.collection("transactions").doc(id).delete();
}

export async function listBudgets(): Promise<Budget[]> {
  await ensureSeeded();
  const db = getDb();
  const snap = await db.collection("budgets").get();
  return snap.docs.map((doc) => ({
    categoryId: doc.id,
    monthlyLimit: (doc.data().monthlyLimit as number) ?? 0,
  }));
}

export async function setBudget(categoryId: string, monthlyLimit: number): Promise<void> {
  const db = getDb();
  await db.collection("budgets").doc(categoryId).set({ monthlyLimit }, { merge: true });
}
