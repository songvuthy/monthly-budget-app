import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

// If TURSO_DATABASE_URL is set, connect to your hosted Turso database
// (needed once this is deployed, since Vercel's filesystem doesn't persist).
// If not set, fall back to a local SQLite file — zero config for local dev.
export function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL ?? "file:./data/local.db";
    const authToken = process.env.TURSO_AUTH_TOKEN;
    client = createClient({ url, authToken });
  }
  return client;
}
