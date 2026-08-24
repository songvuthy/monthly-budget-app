export function formatCurrency(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function currentMonthLabel() {
  return new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function isInCurrentMonth(isoDate: string) {
  const now = new Date();
  const d = new Date(isoDate + "T00:00:00");
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
