import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseError } from "@gofluent/core";
import { DatabaseSyncCtor, type DatabaseSyncInstance } from "./node-sqlite.js";

/**
 * Opens the GoFluent SQLite database using Node's built-in `node:sqlite`
 * driver — chosen over better-sqlite3/Drizzle/Kysely specifically to avoid
 * the native-dependency/prebuilt-binary risk on Windows CI (DATABASE.md §112-113).
 */
export function openDatabase(filePath: string): DatabaseSyncInstance {
  try {
    if (filePath !== ":memory:") {
      mkdirSync(dirname(filePath), { recursive: true });
    }

    const db = new DatabaseSyncCtor(filePath);

    // DATABASE.md §54 — foreign keys must be explicitly enabled per connection.
    db.exec("PRAGMA foreign_keys = ON;");

    // DATABASE.md §55 — WAL mode is desired but not guaranteed on every
    // filesystem (e.g. some network drives); fall back silently rather than
    // failing startup (ARCHITECTURE.md risk #3).
    try {
      db.exec("PRAGMA journal_mode = WAL;");
    } catch {
      // fall back to the default rollback journal
    }

    // DATABASE.md §56 — avoid immediate SQLITE_BUSY errors under light concurrency.
    db.exec("PRAGMA busy_timeout = 5000;");

    return db;
  } catch (cause) {
    throw new DatabaseError(`Failed to open database at ${filePath}`, { cause });
  }
}
