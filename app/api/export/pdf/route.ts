import PDFDocument from "pdfkit";
import { buildReportData, reportFilename } from "@/lib/report";

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const { transactions, labelFor, totalIncome, totalExpense, net, categoryBreakdown, rangeLabel } =
    await buildReportData({ from, to });

  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const bufferPromise = streamToBuffer(doc);

  const ink = "#1b2b23";
  const inkSoft = "#445045";
  const rust = "#8c3a2e";
  const green = "#3f6b4d";
  const line = "#c9cdbe";

  // Header
  doc.font("Helvetica-Bold").fontSize(20).fillColor(ink).text("The Monthly Ledger");
  doc.font("Helvetica").fontSize(10).fillColor(inkSoft).text(`Report range: ${rangeLabel}`);
  doc.moveDown(0.5);
  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor(ink).lineWidth(1.2).stroke();
  doc.moveDown(1);

  // Summary
  doc.font("Helvetica-Bold").fontSize(13).fillColor(ink).text("Summary");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(11).fillColor(green).text(`Income:   $${totalIncome.toFixed(2)}`);
  doc.fillColor(rust).text(`Expenses: $${totalExpense.toFixed(2)}`);
  doc.fillColor(net >= 0 ? green : rust).text(`Net:      $${net.toFixed(2)}`);
  doc.moveDown(1);

  // Category breakdown
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(13).text("Spending by category");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10);
  for (const row of categoryBreakdown) {
    const over = row.limit > 0 && row.spent > row.limit;
    const limitText = row.limit > 0 ? ` / $${row.limit.toFixed(2)} budgeted` : "";
    doc
      .fillColor(over ? rust : ink)
      .text(`${row.label}: $${row.spent.toFixed(2)}${limitText}`);
  }
  doc.moveDown(1);

  // Transactions table
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(13).text("Transactions");
  doc.moveDown(0.4);

  const colX = { date: 48, type: 118, category: 178, note: 318, amount: 480 };
  const rowTop = () => doc.y;

  function drawHeaderRow() {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(inkSoft);
    const y = rowTop();
    doc.text("DATE", colX.date, y, { width: 65 });
    doc.text("TYPE", colX.type, y, { width: 55 });
    doc.text("CATEGORY", colX.category, y, { width: 135 });
    doc.text("NOTE", colX.note, y, { width: 155 });
    doc.text("AMOUNT", colX.amount, y, { width: 70, align: "right" });
    doc.moveDown(0.3);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor(line).lineWidth(0.7).stroke();
    doc.moveDown(0.3);
  }

  drawHeaderRow();
  doc.font("Helvetica").fontSize(9);

  for (const t of transactions) {
    if (doc.y > 760) {
      doc.addPage();
      drawHeaderRow();
      doc.font("Helvetica").fontSize(9);
    }
    const y = rowTop();
    const cat = labelFor(t.categoryId);
    doc.fillColor(ink);
    doc.text(t.date, colX.date, y, { width: 65 });
    doc.text(t.type, colX.type, y, { width: 55 });
    doc.text(cat, colX.category, y, { width: 135 });
    doc.text(t.note || "-", colX.note, y, { width: 155 });
    doc
      .fillColor(t.type === "expense" ? rust : green)
      .text(`${t.type === "expense" ? "-" : "+"}$${t.amount.toFixed(2)}`, colX.amount, y, {
        width: 70,
        align: "right",
      });
    doc.moveDown(0.5);
  }

  if (transactions.length === 0) {
    doc.fillColor(inkSoft).font("Helvetica-Oblique").text("No transactions in this range.");
  }

  doc.end();
  const buffer = await bufferPromise;
  const filename = reportFilename("budget-report", "pdf", { from, to });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
