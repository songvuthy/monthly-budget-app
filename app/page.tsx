"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import type { Budget, Category, Transaction } from "@/lib/db";
import { formatCurrency, currentMonthRange } from "@/lib/format";
import { buildCategoryTree } from "@/lib/categoryTree";

export default function DashboardPage() {
  const defaultRange = currentMonthRange();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll(from: string, to: string) {
    setLoading(true);
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);

    const [catRes, budRes, txRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/budgets"),
      fetch(`/api/transactions?${query.toString()}`),
    ]);
    setCategories(await catRes.json());
    setBudgets(await budRes.json());
    setTransactions(await txRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilter() {
    loadAll(fromDate, toDate);
  }

  function resetToThisMonth() {
    const range = currentMonthRange();
    setFromDate(range.from);
    setToDate(range.to);
    loadAll(range.from, range.to);
  }

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;

  const spendByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    spendByCategory.set(t.categoryId, (spendByCategory.get(t.categoryId) ?? 0) + t.amount);
  }
  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b.monthlyLimit]));

  const tree = buildCategoryTree(categories);
  const breakdownRows = tree
    .map(({ category, children }) => {
      const ownSpent = spendByCategory.get(category.id) ?? 0;
      const ownLimit = budgetByCategory.get(category.id) ?? 0;
      const childRows = children
        .map((child) => ({
          category: child,
          spent: spendByCategory.get(child.id) ?? 0,
          limit: budgetByCategory.get(child.id) ?? 0,
        }))
        .filter((r) => r.spent > 0 || r.limit > 0);
      const totalSpent = ownSpent + childRows.reduce((s, r) => s + r.spent, 0);
      const totalLimit = ownLimit + childRows.reduce((s, r) => s + r.limit, 0);
      return { category, totalSpent, totalLimit, childRows };
    })
    .filter((row) => row.totalSpent > 0 || row.totalLimit > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const totalBudget = budgets.reduce((s, b) => s + b.monthlyLimit, 0);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  function categoryLabel(id: string) {
    const cat = categoryById.get(id);
    if (!cat) return "Unknown";
    if (!cat.parentId) return cat.name;
    const parent = categoryById.get(cat.parentId);
    return parent ? `${parent.name} \u203a ${cat.name}` : cat.name;
  }

  const recentTx = transactions.slice(0, 5);

  return (
    <PageShell>
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
          <h2>Summary</h2>
        </div>
        <div className="form-row form-row-filter" style={{ marginBottom: 20 }}>
          <div className="field">
            <label htmlFor="fromDate">From</label>
            <input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="toDate">To</label>
            <input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="submit-btn" style={{ padding: "9px 16px" }} onClick={applyFilter}>
            Filter
          </button>
          <button className="delete-btn" style={{ padding: "9px 4px", textDecoration: "underline" }} onClick={resetToThisMonth}>
            This month
          </button>
        </div>

        <div className="summary-grid">
          <div className="stat positive">
            <span className="eyebrow">Income</span>
            <span className="figure">{formatCurrency(income)}</span>
          </div>
          <div className="stat negative">
            <span className="eyebrow">Spent</span>
            <span className="figure">{formatCurrency(expenses)}</span>
          </div>
          <div className={`stat ${net >= 0 ? "positive" : "negative"}`}>
            <span className="eyebrow">Net</span>
            <span className="figure">{formatCurrency(net)}</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Spending by category</h2>
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : breakdownRows.length === 0 ? (
          <p className="empty-state">
            No spending logged for this range. Add a transaction in the Register to see it here.
          </p>
        ) : (
          breakdownRows.map(({ category, totalSpent, totalLimit, childRows }) => {
            const pct = totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0;
            const over = totalLimit > 0 && totalSpent > totalLimit;
            return (
              <div key={category.id}>
                <div className="budget-row">
                  <div className="budget-row-head">
                    <span className="tag" style={{ fontWeight: 600 }}>
                      <span className="dot" style={{ background: category.color }} />
                      {category.name}
                    </span>
                    <span className="figure">
                      {formatCurrency(totalSpent)}
                      {totalLimit > 0 && (
                        <span style={{ color: "var(--ink-soft)" }}> / {formatCurrency(totalLimit)}</span>
                      )}
                    </span>
                  </div>
                  <div className="tally">
                    <div className={`tally-fill ${over ? "over" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {childRows.length > 0 && (
                  <div style={{ paddingLeft: 20, borderLeft: "1px dashed var(--line-strong)", marginLeft: 4, marginBottom: 8 }}>
                    {childRows.map((row) => {
                      const childPct = row.limit > 0 ? Math.min(100, (row.spent / row.limit) * 100) : 0;
                      const childOver = row.limit > 0 && row.spent > row.limit;
                      return (
                        <div className="budget-row" key={row.category.id}>
                          <div className="budget-row-head">
                            <span className="tag">
                              <span className="dot" style={{ background: row.category.color }} />
                              {row.category.name}
                            </span>
                            <span className="figure">
                              {formatCurrency(row.spent)}
                              {row.limit > 0 && (
                                <span style={{ color: "var(--ink-soft)" }}> / {formatCurrency(row.limit)}</span>
                              )}
                            </span>
                          </div>
                          <div className="tally">
                            <div className={`tally-fill ${childOver ? "over" : ""}`} style={{ width: `${childPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <p style={{ marginTop: 16 }}>
          <span className="eyebrow">Total monthly budget (all categories)</span>
          <span className="figure" style={{ fontSize: 18 }}>
            {formatCurrency(totalBudget)}
          </span>
        </p>
      </section>

      <section className="card">
        <h2>Recent entries</h2>
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : recentTx.length === 0 ? (
          <p className="empty-state">Nothing logged for this range yet.</p>
        ) : (
          <div className="table-scroll">
          <table className="register">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.map((t) => (
                <tr key={t.id}>
                  <td className="figure">{t.date}</td>
                  <td>
                    <span className="tag">
                      <span className="dot" style={{ background: categoryById.get(t.categoryId)?.color ?? "#999" }} />
                      {categoryLabel(t.categoryId)}
                    </span>
                  </td>
                  <td>{t.note || "—"}</td>
                  <td
                    className={`figure ${t.type === "expense" ? "amount-expense" : "amount-income"}`}
                    style={{ textAlign: "right" }}
                  >
                    {t.type === "expense" ? "-" : "+"}
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
