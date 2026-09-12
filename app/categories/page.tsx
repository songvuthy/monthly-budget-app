"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import type { Category } from "@/lib/db";
import { buildCategoryTree } from "@/lib/categoryTree";

const swatches = [
  "#8C6D46", "#5B7C5D", "#6B7A94", "#A6642C",
  "#7A5C7E", "#8A8878", "#3F6B4D", "#8C3A2E", "#B8935B",
  "#4A7C82", "#6E7B3F", "#9C5B5B",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(swatches[0]);
  const [newParentId, setNewParentId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const topLevelCategories = categories.filter((c) => !c.parentId);
  const tree = buildCategoryTree(categories);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newName.trim()) {
      setError("Give the category a name.");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        color: newColor,
        parentId: newParentId || null,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create category.");
      return;
    }
    setNewName("");
    setNewParentId("");
    await load();
  }

  function startEdit(c: Category) {
    setEditId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
    setEditParentId(c.parentId ?? "");
    setEditError(null);
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setEditError(null);
    setSaving(true);
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        color: editColor,
        parentId: editParentId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setEditError(body.error ?? "Could not save changes.");
      return;
    }
    setEditId(null);
    await load();
  }

  function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {swatches.map((s) => (
          <button
            type="button"
            key={s}
            className={`swatch ${value === s ? "selected" : ""}`}
            onClick={() => onChange(s)}
            style={{ background: s }}
            aria-label={`Choose color ${s}`}
            aria-pressed={value === s}
          />
        ))}
      </div>
    );
  }

  function EditIcon() {
    return (
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M13.5 3.5l3 3L6 17l-3.6.9L3.3 14.3 13.5 3.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  function EditRow({ c }: { c: Category }) {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div className="field" style={{ maxWidth: 180 }}>
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
        <ColorPicker value={editColor} onChange={setEditColor} />
        <div className="field">
          <select value={editParentId} onChange={(e) => setEditParentId(e.target.value)}>
            <option value="">— Top-level category —</option>
            {topLevelCategories
              .filter((p) => p.id !== c.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  Sub-category of {p.name}
                </option>
              ))}
          </select>
        </div>
        <button className="submit-btn" style={{ padding: "6px 14px" }} onClick={() => saveEdit(c.id)} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="link-pill" onClick={cancelEdit}>
          Cancel
        </button>
        {editError && <p style={{ color: "var(--rust-warn)", fontSize: 12, width: "100%" }}>{editError}</p>}
      </div>
    );
  }

  return (
    <PageShell>
      <section className="card">
        <h2>Add a category</h2>
        <form onSubmit={handleCreate}>
          <div className="form-row form-row-category">
            <div className="field">
              <label htmlFor="newName">Name</label>
              <input
                id="newName"
                type="text"
                placeholder="e.g. Travel"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="newParent">Parent (optional)</label>
              <select
                id="newParent"
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
              >
                <option value="">— Top-level category —</option>
                {topLevelCategories.map((p) => (
                  <option key={p.id} value={p.id}>
                    Sub-category of {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="submit-btn" disabled={creating}>
              {creating ? "Adding…" : "Add category"}
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            <span className="eyebrow">Color</span>
            <div style={{ marginTop: 8 }}>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
          </div>
          {error && (
            <p style={{ color: "var(--rust-warn)", fontSize: 13, marginTop: 10 }}>{error}</p>
          )}
        </form>
        <p className="hint" style={{ marginBottom: 0 }}>
          Categories nest one level deep — pick a parent above to add a sub-category.
        </p>
      </section>

      <section className="card">
        <h2>Your categories</h2>
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : (
          <div className="category-grid">
          {tree.map(({ category, children }) => {
            const isEditingHere = editId === category.id || children.some((c) => c.id === editId);
            return (
            <div
              className={`category-cluster ${children.length > 0 ? "wide" : ""} ${isEditingHere ? "editing" : ""}`}
              key={category.id}
            >
              <div className="budget-row">
                {editId === category.id ? (
                  <EditRow c={category} />
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="tag" style={{ fontWeight: 600 }}>
                      <span className="dot" style={{ background: category.color }} />
                      {category.name}
                    </span>
                    <button className="icon-btn" onClick={() => startEdit(category)} aria-label={`Edit ${category.name}`}>
                      <EditIcon />
                    </button>
                  </div>
                )}
              </div>

              {children.length > 0 && (
                <div className="subgroup">
                  {children.map((child) => (
                    <div className="budget-row" key={child.id}>
                      {editId === child.id ? (
                        <EditRow c={child} />
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="tag">
                            <span className="dot" style={{ background: child.color }} />
                            {child.name}
                          </span>
                          <button className="icon-btn" onClick={() => startEdit(child)} aria-label={`Edit ${child.name}`}>
                            <EditIcon />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            );
          })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
