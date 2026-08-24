"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentMonthLabel } from "@/lib/format";

const tabs = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Register" },
  { href: "/budgets", label: "Budgets" },
  { href: "/categories", label: "Categories" },
];

export default function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <header className="masthead">
        <h1>The Monthly Ledger</h1>
        <span className="month">{currentMonthLabel()}</span>
      </header>
      <nav className="tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={pathname === tab.href ? "active" : ""}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
