import { listBudgets, listCategories, listTransactions } from "@/lib/db";

function categoryLabel(categoryById: Map<string, { name: string; parentId: string | null }>, id: string) {
  const cat = categoryById.get(id);
  if (!cat) return "Unknown";
  if (!cat.parentId) return cat.name;
  const parent = categoryById.get(cat.parentId);
  return parent ? `${parent.name} \u203a ${cat.name}` : cat.name;
}

export async function buildReportData(filter?: { from?: string; to?: string }) {
  const [transactions, categories, budgets] = await Promise.all([
    listTransactions(filter),
    listCategories(),
    listBudgets(),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const labelFor = (id: string) => categoryLabel(categoryById, id);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const spendByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    spendByCategory.set(t.categoryId, (spendByCategory.get(t.categoryId) ?? 0) + t.amount);
  }

  const categoryBreakdown = categories
    .map((c) => ({
      category: c,
      label: labelFor(c.id),
      spent: spendByCategory.get(c.id) ?? 0,
      limit: budgets.find((b) => b.categoryId === c.id)?.monthlyLimit ?? 0,
    }))
    .filter((row) => row.spent > 0 || row.limit > 0)
    .sort((a, b) => b.spent - a.spent);

  const rangeLabel =
    filter?.from || filter?.to
      ? `${filter?.from ?? "start"} to ${filter?.to ?? "today"}`
      : "All time";

  return {
    transactions,
    categoryById,
    labelFor,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    categoryBreakdown,
    rangeLabel,
  };
}

export function reportFilename(base: string, ext: string, filter?: { from?: string; to?: string }) {
  const rangePart = filter?.from || filter?.to ? `_${filter?.from ?? "start"}_to_${filter?.to ?? "now"}` : "";
  return `${base}${rangePart}.${ext}`;
}
