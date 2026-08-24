import { NextResponse } from "next/server";
import { addTransaction, listTransactions } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const transactions = await listTransactions({ from, to });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const body = await request.json();

  const amount = Number(body.amount);
  if (!body.date || !body.categoryId || !body.type || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Provide date, categoryId, type, and a positive amount." },
      { status: 400 }
    );
  }

  const record = await addTransaction({
    date: body.date,
    amount,
    type: body.type === "income" ? "income" : "expense",
    categoryId: body.categoryId,
    note: body.note ?? "",
  });

  return NextResponse.json(record, { status: 201 });
}
