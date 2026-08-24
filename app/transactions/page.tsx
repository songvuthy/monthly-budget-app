"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import type { Category, Transaction } from "@/lib/db";
import { formatCurrency, todayISO } from "@/lib/format";
import { buildCategoryTree } from "@/lib/categoryTree";

export default function TransactionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function loadAll(filters?: { from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (filters?.from) query.set("from", filters.from);
    if (filters?.to) query.set("to", filters.to);
    const qs = query.toString() ? `?${query.toString()}` : "";

    const [catRes, txRes] = await Promise.all([
      fetch("/api/categories"),
      fetch(`/api/transactions${qs}`),
    ]);
    const cats: Category[] = await catRes.json();
    const txs: Transaction[] = await txRes.json();
    setCategories(cats);
    setTransactions(txs);
    if (!categoryId && cats.length > 0) setCategoryId(cats[0].id);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilter() {
    setLoading(true);
    loadAll({ from: fromDate || undefined, to: toDate || undefined });
  }

  function clearFilter() {
    setFromDate("");
    setToDate("");
    setLoading(true);
    loadAll();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, amount, type, categoryId, note }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong adding that entry.");
      return;
    }

    setAmount("");
    setNote("");
    await loadAll({ from: fromDate || undefined, to: toDate || undefined });
  }

  async function handleDelete(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
  }

  function exportHref(format: "csv" | "xlsx" | "pdf") {
    const query = new URLSearchParams();
    if (fromDate) query.set("from", fromDate);
    if (toDate) query.set("to", toDate);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const path = format === "csv" ? "/api/export" : `/api/export/${format}`;
    return `${path}${qs}`;
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  function categoryLabel(cat?: Category) {
    if (!cat) return "Unknown";
    if (!cat.parentId) return cat.name;
    const parent = categoryById.get(cat.parentId);
    return parent ? `${parent.name} \u203a ${cat.name}` : cat.name;
  }

  return (
    <PageShell>
      <section className="card">
        <h2>Add an entry</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {buildCategoryTree(categories).map(({ category: parent, children }) =>
                  children.length > 0 ? (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={parent.id}>{parent.name} (general)</option>
                      {children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="field">
              <label>Type</label>
              <div className="type-toggle">
                <button
                  type="button"
                  className={type === "expense" ? "selected expense" : ""}
                  onClick={() => setType("expense")}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={type === "income" ? "selected income" : ""}
                  onClick={() => setType("income")}
                >
                  Income
                </button>
              </div>
            </div>
          </div>

          <div className="form-row form-row-note">
            <div className="field">
              <label htmlFor="note">Note (optional)</label>
              <input
                id="note"
                type="text"
                placeholder="e.g. Farmers market"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Adding…" : "Add entry"}
            </button>
          </div>
          {error && (
            <p style={{ color: "var(--rust-warn)", fontSize: 13, marginTop: 10 }}>{error}</p>
          )}
        </form>
      </section>

      <section className="card">
        <h2>Full register</h2>

        <div
          className="form-row form-row-filter"
          style={{ marginBottom: 14 }}
        >
          <div className="field">
            <label htmlFor="fromDate">From</label>
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="toDate">To</label>
            <input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button className="submit-btn" style={{ padding: "9px 16px" }} onClick={applyFilter}>
            Filter
          </button>
          <button
            className="delete-btn"
            style={{ padding: "9px 4px", textDecoration: "underline" }}
            onClick={clearFilter}
          >
            Clear
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <span className="eyebrow" style={{ alignSelf: "center", marginBottom: 0 }}>
            Export:
          </span>
          <a
            href={exportHref("csv")}
            className="submit-btn"
            style={{ padding: "8px 14px", textDecoration: "none", background: "var(--ink-soft)" }}
          >
            CSV
          </a>
          <a
            href={exportHref("xlsx")}
            className="submit-btn"
            style={{ padding: "8px 14px", textDecoration: "none" }}
          >
            Excel
          </a>
          <a
            href={exportHref("pdf")}
            className="submit-btn"
            style={{ padding: "8px 14px", textDecoration: "none", background: "var(--brass-deep)" }}
          >
            PDF
          </a>
        </div>

        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="empty-state">No entries match this range. Try widening the filter or add a new one above.</p>
        ) : (
          <div className="table-scroll">
          <table className="register">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const cat = categoryById.get(t.categoryId);
                return (
                  <tr key={t.id}>
                    <td className="figure">{t.date}</td>
                    <td>
                      <span className="tag">
                        <span className="dot" style={{ background: cat?.color ?? "#999" }} />
                        {categoryLabel(cat)}
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
                    <td style={{ textAlign: "right" }}>
                      <button className="delete-btn" onClick={() => handleDelete(t.id)}>
                        remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
