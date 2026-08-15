import { describe, expect, it } from "vitest";
import { runMigrations } from "./migrations/migrate.js";
import { openDatabase } from "./sqlite/connection.js";
import { SqliteBossChallengeRepository, SqliteLexemeRepository, SqliteWorldRepository } from "./repositories.js";
import { seedBossChallenges, seedInitialLexemes, seedWorlds } from "./seed.js";

describe("seedInitialLexemes", () => it("is idempotent", () => {
  const db = openDatabase(":memory:"); runMigrations(db); const repository = new SqliteLexemeRepository(db);
  seedInitialLexemes(repository, "2026-01-01T00:00:00.000Z"); seedInitialLexemes(repository, "2026-01-02T00:00:00.000Z");
  expect((db.prepare("SELECT count(*) AS count FROM lexemes").get() as { count:number }).count).toBe(4);
}));

describe("seedWorlds", () => {
  it("is idempotent and preserves target vocabulary", () => {
    const db = openDatabase(":memory:"); runMigrations(db);
    const repository = new SqliteWorldRepository(db);
    seedWorlds(repository, "2026-01-01T00:00:00.000Z");
    seedWorlds(repository, "2026-01-02T00:00:00.000Z");

    expect((db.prepare("SELECT count(*) AS count FROM worlds").get() as { count: number }).count).toBe(3);
    const everydayLife = repository.getByKey("en", "everyday-life");
    expect(everydayLife?.targetLexemeIds).toEqual(["lex_be", "lex_have"]);
  });
});

describe("seedBossChallenges", () => {
  it("is idempotent and links each challenge to its world", () => {
    const db = openDatabase(":memory:"); runMigrations(db);
    const worlds = new SqliteWorldRepository(db);
    const challenges = new SqliteBossChallengeRepository(db);
    seedWorlds(worlds, "2026-01-01T00:00:00.000Z");
    seedBossChallenges(challenges, "2026-01-01T00:00:00.000Z");
    seedBossChallenges(challenges, "2026-01-02T00:00:00.000Z");

    expect((db.prepare("SELECT count(*) AS count FROM boss_challenges").get() as { count: number }).count).toBe(3);
    const travelWorld = worlds.getByKey("en", "travel");
    const travelChallenges = challenges.listByWorld(travelWorld!.id);
    expect(travelChallenges).toHaveLength(1);
    expect(travelChallenges[0]?.title).toBe("Airport Check-In");
    expect(travelChallenges[0]?.targetPhrases.length).toBeGreaterThan(0);
  });
});
