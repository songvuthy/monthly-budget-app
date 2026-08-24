import { buildReportData, reportFilename } from "@/lib/report";

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const { transactions, labelFor, totalIncome, totalExpense, net } =
    await buildReportData({ from, to });

  const header = ["Date", "Type", "Category", "Amount", "Note"];
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    labelFor(t.categoryId),
    t.amount.toFixed(2),
    t.note ?? "",
  ]);

  const lines = [
    header.join(","),
    ...rows.map((r) => r.map((cell) => csvEscape(String(cell))).join(",")),
    "",
    `Total Income,,,${totalIncome.toFixed(2)},`,
    `Total Expense,,,${totalExpense.toFixed(2)},`,
    `Net,,,${net.toFixed(2)},`,
  ];

  const csv = lines.join("\n");
  const filename = reportFilename("budget-report", "csv", { from, to });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
