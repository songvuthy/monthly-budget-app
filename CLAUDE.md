# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next`)

There is no test suite configured in this repo.

## Architecture

This is a personal budget-tracking app ("The Monthly Ledger"): categories, transactions (income/expense), monthly budgets per category, and CSV/PDF/XLSX export — built with Next.js (App Router) and shipped both as a web app and as an Android shell via Capacitor.

**Data flow**: All pages under `app/*/page.tsx` are client components (`"use client"`) that fetch JSON from route handlers in `app/api/**/route.ts`, which call functions in [lib/db.ts](lib/db.ts). There are no server components doing data fetching and no client-side state library — each page owns its own `useState`/`useEffect` fetch-on-mount logic (see [app/page.tsx](app/page.tsx) for the pattern).

**Storage** ([lib/turso.ts](lib/turso.ts), [lib/db.ts](lib/db.ts)): the app talks to SQLite via `@libsql/client`, which transparently supports two modes:
- Local dev: no `TURSO_DATABASE_URL` set → falls back to a local file at `data/local.db`.
- Deployed (e.g. Vercel, whose filesystem is ephemeral): `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` env vars point at a hosted Turso database instead.

`lib/db.ts` also lazily creates tables and seeds default categories/budgets on first access per server instance (`ensureReady()`), so there's no separate migration step — schema changes are made by editing the `CREATE TABLE IF NOT EXISTS` statements directly.

**Category model**: exactly two levels — a category has `parentId: null` (top-level) or points at a top-level category. Sub-of-sub nesting is rejected in the API layer ([app/api/categories/route.ts](app/api/categories/route.ts), [app/api/categories/[id]/route.ts](app/api/categories/[id]/route.ts)). Sub-categories inherit their parent's color (see the palette comment in [lib/db.ts](lib/db.ts)) so the UI visually groups them. [lib/categoryTree.ts](lib/categoryTree.ts) builds the parent→children tree used for rendering.

**Reporting/export**: [lib/report.ts](lib/report.ts)'s `buildReportData()` is the shared aggregation (totals, per-category spend vs. budget, category labels like "Home › Rent") consumed by all three export routes: `app/api/export/route.ts` (CSV), `app/api/export/pdf/route.ts` (pdfkit), `app/api/export/xlsx/route.ts` (exceljs). `pdfkit` and `@libsql/client` are marked `serverExternalPackages` in [next.config.ts](next.config.ts) because pdfkit reads font files from disk at runtime by relative path, which breaks if Next bundles it into the server chunk.

**Android shell** ([capacitor.config.ts](capacitor.config.ts), `android/`): the Android app is *not* an offline bundle — Capacitor's `server.url` points it directly at the deployed Next.js app, so `mobile-shell/index.html` is just a placeholder that's normally never shown. After changing the deployed URL, run `npx cap sync android`.

## Notes

- `.env.local.example` in this repo contains what look like live Turso credentials (a real database URL and JWT auth token), not placeholders — treat it as a secret, not a template, and avoid committing further changes to it.
