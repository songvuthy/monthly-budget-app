"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import type { Budget, Category, Transaction } from "@/lib/db";
import { formatCurrency, isInCurrentMonth } from "@/lib/format";
import { buildCategoryTree } from "@/lib/categoryTree";

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadAll() {
    const [catRes, budRes, txRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/budgets"),
      fetch("/api/transactions"),
    ]);
    const cats: Category[] = await catRes.json();
    const buds: Budget[] = await budRes.json();
    const txs: Transaction[] = await txRes.json();
    setCategories(cats);
    setBudgets(buds);
    setTransactions(txs);
    const initialDrafts: Record<string, string> = {};
    for (const c of cats) {
      const existing = buds.find((b) => b.categoryId === c.id);
      initialDrafts[c.id] = existing ? String(existing.monthlyLimit) : "0";
    }
    setDrafts(initialDrafts);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSave(categoryId: string) {
    const monthlyLimit = Number(drafts[categoryId]);
    if (Number.isNaN(monthlyLimit) || monthlyLimit < 0) return;

    setSavingId(categoryId);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, monthlyLimit }),
    });
    await loadAll();
    setSavingId(null);
  }

  const monthTx = transactions.filter((t) => isInCurrentMonth(t.date) && t.type === "expense");
  const spentByCategory = new Map<string, number>();
  for (const t of monthTx) {
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount);
  }

  function Row({ c, indent = false, label }: { c: Category; indent?: boolean; label?: string }) {
    const limit = Number(drafts[c.id] ?? 0);
    const spent = spentByCategory.get(c.id) ?? 0;
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const over = limit > 0 && spent > limit;

    return (
      <div className="budget-row">
        <div className="budget-row-head">
          <span className="tag" style={indent ? undefined : { fontWeight: 600 }}>
            <span className="dot" style={{ background: c.color }} />
            <span className="tag-label">{label ?? c.name}</span>
          </span>
          <span className="row-trailing">
            {limit > 0 && <span className={`pct-pill ${over ? "over" : ""}`}>{Math.round(pct)}%</span>}
            <span className="figure">
              {formatCurrency(spent)}
              {limit > 0 && <span style={{ color: "var(--ink-soft)" }}> / {formatCurrency(limit)}</span>}
            </span>
          </span>
        </div>
        <div className="tally" style={{ marginBottom: 10 }}>
          <div className={`tally-fill ${over ? "over" : ""}`} style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <label htmlFor={`limit-${c.id}`} style={{ marginBottom: 0 }}>
              Limit
            </label>
            <span className="input-prefix">
              <span className="prefix-sign">$</span>
              <input
                id={`limit-${c.id}`}
                className="budget-limit-input"
                type="number"
                min="0"
                step="1"
                value={drafts[c.id] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
              />
            </span>
          </div>
          <button
            className="submit-btn"
            style={{ padding: "6px 14px" }}
            onClick={() => handleSave(c.id)}
            disabled={savingId === c.id}
          >
            {savingId === c.id ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  const tree = buildCategoryTree(categories);

  return (
    <PageShell>
      <section className="card">
        <h2>Monthly budgets</h2>
        <p className="hint">
          Set a monthly limit per category or sub-category. The tally fills as you spend, and turns
          to warn you once you cross the line.
        </p>

        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : (
          <div className="category-grid">
          {tree.map(({ category, children }) => {
            // Roll up spend/limit across children into the parent header row,
            // then show each child's own tally underneath.
            const ownSpent = spentByCategory.get(category.id) ?? 0;
            const ownLimit = Number(drafts[category.id] ?? 0);
            const childSpent = children.reduce((s, c) => s + (spentByCategory.get(c.id) ?? 0), 0);
            const childLimit = children.reduce((s, c) => s + Number(drafts[c.id] ?? 0), 0);
            const totalSpent = ownSpent + childSpent;
            const totalLimit = ownLimit + childLimit;

            if (children.length === 0) {
              return (
                <div className="category-cluster" key={category.id}>
                  <Row c={category} />
                </div>
              );
            }

            const pct = totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0;
            const over = totalLimit > 0 && totalSpent > totalLimit;

            return (
              <div className="category-cluster wide" key={category.id}>
                <div className="budget-row-head">
                  <span className="tag" style={{ fontWeight: 600 }}>
                    <span className="dot" style={{ background: category.color }} />
                    <span className="tag-label">{category.name} — total</span>
                  </span>
                  <span className="row-trailing">
                    {totalLimit > 0 && (
                      <span className={`pct-pill ${over ? "over" : ""}`}>{Math.round((totalSpent / totalLimit) * 100)}%</span>
                    )}
                    <span className="figure">
                      {formatCurrency(totalSpent)}
                      {totalLimit > 0 && (
                        <span style={{ color: "var(--ink-soft)" }}> / {formatCurrency(totalLimit)}</span>
                      )}
                    </span>
                  </span>
                </div>
                <div className="tally" style={{ marginBottom: 4 }}>
                  <div className={`tally-fill ${over ? "over" : ""}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="subgroup">
                  <Row c={category} indent label={`${category.name} (general)`} />
                  {children.map((child) => (
                    <Row key={child.id} c={child} indent />
                  ))}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
