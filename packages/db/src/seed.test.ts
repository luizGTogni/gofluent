import { describe, expect, it } from "vitest";
import { runMigrations } from "./migrations/migrate.js";
import { openDatabase } from "./sqlite/connection.js";
import { SqliteLexemeRepository } from "./repositories.js";
import { seedInitialLexemes } from "./seed.js";
describe("seedInitialLexemes", () => it("is idempotent", () => {
  const db = openDatabase(":memory:"); runMigrations(db); const repository = new SqliteLexemeRepository(db);
  seedInitialLexemes(repository, "2026-01-01T00:00:00.000Z"); seedInitialLexemes(repository, "2026-01-02T00:00:00.000Z");
  expect((db.prepare("SELECT count(*) AS count FROM lexemes").get() as { count:number }).count).toBe(4);
}));
