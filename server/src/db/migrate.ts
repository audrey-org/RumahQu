import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";
import { getPool, withTransaction } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(__dirname, "migrations");

async function ensureMigrationsTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function runMigrations() {
  const files = (await fs.readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  await withTransaction(async (client) => {
    await ensureMigrationsTable(client);

    for (const file of files) {
      const alreadyApplied = await client.query<{ version: string }>(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [file],
      );

      if (alreadyApplied.rowCount) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
    }
  });
}

export async function resetDatabaseForTests() {
  const pool = getPool();
  await pool.query(`
    TRUNCATE TABLE
      sessions,
      email_verification_tokens,
      password_reset_tokens,
      group_invites,
      group_members,
      inventory_adjustments,
      shopping_list_items,
      inventory_items,
      groups,
      users
    RESTART IDENTITY CASCADE
  `);
}
