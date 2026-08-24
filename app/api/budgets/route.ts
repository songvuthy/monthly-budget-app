import { NextResponse } from "next/server";
import { listBudgets, setBudget } from "@/lib/db";

export async function GET() {
  const budgets = await listBudgets();
  return NextResponse.json(budgets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const monthlyLimit = Number(body.monthlyLimit);

  if (!body.categoryId || Number.isNaN(monthlyLimit) || monthlyLimit < 0) {
    return NextResponse.json(
      { error: "Provide categoryId and a non-negative monthlyLimit." },
      { status: 400 }
    );
  }

  await setBudget(body.categoryId, monthlyLimit);
  return NextResponse.json({ ok: true });
}
