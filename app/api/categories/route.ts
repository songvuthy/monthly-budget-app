import { NextResponse } from "next/server";
import { addCategory, listCategories } from "@/lib/db";

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const color = String(body.color ?? "").trim();
  const parentId =
    typeof body.parentId === "string" && body.parentId.length > 0 ? body.parentId : null;

  if (!name) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }
  const hexColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#8A8878";

  // Keep the model to two levels: a sub-category's parent must itself be
  // top-level (no sub-of-sub nesting).
  if (parentId) {
    const categories = await listCategories();
    const parent = categories.find((c) => c.id === parentId);
    if (!parent) {
      return NextResponse.json({ error: "Parent category not found." }, { status: 400 });
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Cannot nest a sub-category under another sub-category." },
        { status: 400 }
      );
    }
  }

  const record = await addCategory({ name, color: hexColor, parentId });
  return NextResponse.json(record, { status: 201 });
}
