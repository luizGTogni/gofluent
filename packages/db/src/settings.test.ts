import { describe, expect, it } from "vitest";
import { openDatabase } from "./sqlite/connection.js";
import { runMigrations } from "./migrations/migrate.js";
import { SqliteSettingsRepository } from "./repositories.js";

const now = "2026-01-01T00:00:00.000Z";

describe("SqliteSettingsRepository", () => {
  it("returns null for an unset key", () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    expect(new SqliteSettingsRepository(db).get("active_user_id")).toBeNull();
  });

  it("round-trips a JSON-serializable value and upserts on repeated set", () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    const repo = new SqliteSettingsRepository(db);

    repo.set("active_user_id", "user-1", now);
    expect(repo.get("active_user_id")).toBe("user-1");

    repo.set("active_user_id", "user-2", "2026-01-02T00:00:00.000Z");
    expect(repo.get("active_user_id")).toBe("user-2");

    const rowCount = (db.prepare("SELECT COUNT(*) AS count FROM settings").get() as { count: number }).count;
    expect(rowCount).toBe(1);
  });
});
