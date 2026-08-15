import type { DatabaseSyncInstance } from "../sqlite/node-sqlite.js";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseError } from "@gofluent/core";
import { nowIso } from "@gofluent/shared";

export const MIGRATIONS_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Applies pending `NNNN_description.sql` migrations in order, tracked in
 * `schema_migrations` (DATABASE.md §31, §77-78). Each migration runs in its
 * own transaction; a failure stops the whole run so the app never boots
 * against a half-migrated schema.
 */
export function runMigrations(
  db: DatabaseSyncInstance,
  migrationsDir: string = MIGRATIONS_DIR,
): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare("SELECT version FROM schema_migrations").all() as Array<{
    version: string;
  }>;
  const applied = new Set(appliedRows.map((row) => row.version));

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const newlyApplied: string[] = [];

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) continue;

    const sql = readFileSync(join(migrationsDir, file), "utf-8");

    try {
      db.exec("BEGIN");
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        version,
        nowIso(),
      );
      db.exec("COMMIT");
      newlyApplied.push(version);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw new DatabaseError(`Migration ${version} failed`, { cause });
    }
  }

  return newlyApplied;
}
