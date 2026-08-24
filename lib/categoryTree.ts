import type { Category } from "@/lib/db";

export type CategoryNode = {
  category: Category;
  children: Category[];
};

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const topLevel = categories.filter((c) => !c.parentId);
  return topLevel.map((category) => ({
    category,
    children: categories.filter((c) => c.parentId === category.id),
  }));
}
