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

  function ColorPicker({ value, onChange, size = 22 }: { value: string; onChange: (c: string) => void; size?: number }) {
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {swatches.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => onChange(s)}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: s,
              border: value === s ? "2px solid var(--ink)" : "1px solid var(--line-strong)",
              cursor: "pointer",
            }}
            aria-label={`Choose color ${s}`}
          />
        ))}
      </div>
    );
  }

  function EditRow({ c }: { c: Category }) {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          style={{
            fontFamily: "inherit",
            fontSize: 14,
            padding: "9px 10px",
            border: "1px solid var(--line-strong)",
            borderRadius: 3,
            background: "var(--paper)",
          }}
        />
        <ColorPicker value={editColor} onChange={setEditColor} size={20} />
        <select
          value={editParentId}
          onChange={(e) => setEditParentId(e.target.value)}
          style={{
            fontFamily: "inherit",
            fontSize: 13,
            padding: "8px 10px",
            border: "1px solid var(--line-strong)",
            borderRadius: 3,
            background: "var(--paper)",
          }}
        >
          <option value="">— Top-level category —</option>
          {topLevelCategories
            .filter((p) => p.id !== c.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                Sub-category of {p.name}
              </option>
            ))}
        </select>
        <button className="submit-btn" style={{ padding: "6px 14px" }} onClick={() => saveEdit(c.id)} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="delete-btn" onClick={cancelEdit}>
          cancel
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
          <div style={{ marginTop: 12 }}>
            <span className="eyebrow">Color</span>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          {error && (
            <p style={{ color: "var(--rust-warn)", fontSize: 13, marginTop: 10 }}>{error}</p>
          )}
        </form>
      </section>

      <section className="card">
        <h2>Your categories</h2>
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : (
          tree.map(({ category, children }) => (
            <div className="budget-row" key={category.id}>
              {editId === category.id ? (
                <EditRow c={category} />
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="tag" style={{ fontWeight: 600 }}>
                    <span className="dot" style={{ background: category.color }} />
                    {category.name}
                  </span>
                  <button className="delete-btn" onClick={() => startEdit(category)}>
                    edit
                  </button>
                </div>
              )}

              {children.length > 0 && (
                <div style={{ marginTop: 10, paddingLeft: 20, borderLeft: "1px dashed var(--line-strong)" }}>
                  {children.map((child) => (
                    <div key={child.id} style={{ padding: "8px 0" }}>
                      {editId === child.id ? (
                        <EditRow c={child} />
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="tag">
                            <span className="dot" style={{ background: child.color }} />
                            {child.name}
                          </span>
                          <button className="delete-btn" onClick={() => startEdit(child)}>
                            edit
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </PageShell>
  );
}
