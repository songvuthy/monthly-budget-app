import { NextResponse } from "next/server";
import { listCategories, updateCategory } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const input: { name?: string; color?: string; parentId?: string | null } = {};
  if (typeof body.name === "string" && body.name.trim()) input.name = body.name.trim();
  if (typeof body.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.color)) {
    input.color = body.color;
  }

  if ("parentId" in body) {
    const parentId = typeof body.parentId === "string" && body.parentId.length > 0 ? body.parentId : null;

    if (parentId === id) {
      return NextResponse.json({ error: "A category cannot be its own parent." }, { status: 400 });
    }

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
      const hasChildren = categories.some((c) => c.parentId === id);
      if (hasChildren) {
        return NextResponse.json(
          { error: "This category already has sub-categories, so it can't become a sub-category itself." },
          { status: 400 }
        );
      }
    }

    input.parentId = parentId;
  }

  const updated = await updateCategory(id, input);
  if (!updated) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
