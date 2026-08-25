import type { CapacitorConfig } from '@capacitor/cli';

// This app's data lives on the server (SQLite-style JSON file + API routes),
// so the Android app is a native shell that loads your deployed Next.js app
// directly, rather than a fully offline bundle.
//
// Before building the APK:
// 1. Deploy this Next.js app somewhere reachable from a phone (e.g. Vercel).
// 2. Replace the URL below with that deployed URL.
// 3. Run `npx cap sync android` to apply the change.
const config: CapacitorConfig = {
  appId: 'com.monthlyledger.app',
  appName: 'Monthly Ledger',
  webDir: 'mobile-shell',
  server: {
    // TODO: replace with your real deployed URL, e.g. "https://monthly-ledger.vercel.app"
    url: 'https://pthy-monthly-budget-app.vercel.app',
    cleartext: false,
  },
};

export default config;
