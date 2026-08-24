import ExcelJS from "exceljs";
import { buildReportData, reportFilename } from "@/lib/report";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const { transactions, labelFor, totalIncome, totalExpense, net, categoryBreakdown, rangeLabel } =
    await buildReportData({ from, to });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Monthly Ledger";
  workbook.created = new Date();

  // --- Summary sheet ---
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Amount", key: "amount", width: 16 },
  ];
  summary.getRow(1).font = { bold: true };
  summary.addRow({ metric: `Report range: ${rangeLabel}`, amount: "" });
  summary.addRow({});
  summary.addRow({ metric: "Total income", amount: totalIncome });
  summary.addRow({ metric: "Total expenses", amount: totalExpense });
  summary.addRow({ metric: "Net", amount: net });
  summary.addRow({});
  summary.addRow({ metric: "Category", amount: "Spent / Budget" }).font = { bold: true };
  for (const row of categoryBreakdown) {
    summary.addRow({
      metric: row.label,
      amount: row.limit > 0 ? `${row.spent.toFixed(2)} / ${row.limit.toFixed(2)}` : row.spent.toFixed(2),
    });
  }
  summary.getColumn("amount").numFmt = "#,##0.00";

  // --- Transactions sheet ---
  const sheet = workbook.addWorksheet("Transactions");
  sheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Type", key: "type", width: 12 },
    { header: "Category", key: "category", width: 22 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Note", key: "note", width: 32 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEFE6" } };
  });

  for (const t of transactions) {
    const row = sheet.addRow({
      date: t.date,
      type: t.type,
      category: labelFor(t.categoryId),
      amount: t.type === "expense" ? -t.amount : t.amount,
      note: t.note ?? "",
    });
    row.getCell("amount").numFmt = "#,##0.00";
    if (t.type === "expense") {
      row.getCell("amount").font = { color: { argb: "FF8C3A2E" } };
    } else {
      row.getCell("amount").font = { color: { argb: "FF3F6B4D" } };
    }
  }

  sheet.addRow({});
  const totalsRow = sheet.addRow({ date: "", type: "", category: "Net", amount: net, note: "" });
  totalsRow.font = { bold: true };
  totalsRow.getCell("amount").numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = reportFilename("budget-report", "xlsx", { from, to });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
