import { describe, expect, it } from "vitest";
import { openDatabase, runMigrations, seedInitialLexemes, seedWorlds, SqliteLexemeRepository, SqliteWorldProgressRepository, SqliteWorldRepository } from "@gofluent/db";
import { listWorldsWithProgress, recomputeWorldMastery, WORLD_MASTERY_THRESHOLD } from "./world-activity.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  seedInitialLexemes(new SqliteLexemeRepository(db), now);
  seedWorlds(new SqliteWorldRepository(db), now);
  return db;
}

describe("recomputeWorldMastery", () => {
  it("is 0 when the learner has no state for any target lexeme", () => {
    const db = seededDb();
    const worldId = new SqliteWorldRepository(db).getByKey("en", "everyday-life")!.id;
    const progress = recomputeWorldMastery(db, "u", worldId, new Date(now));
    expect(progress.masteryScore).toBe(0);
    expect(progress.bossChallengeCompleted).toBe(false);
  });

  it("scores partial mastery when only some target lexemes clear the threshold", () => {
    const db = seededDb();
    const worldId = new SqliteWorldRepository(db).getByKey("en", "everyday-life")!.id; // targets: lex_be, lex_have
    db.prepare(
      "INSERT INTO learner_lexeme_state (learner_id,lexeme_id,encounters,heard_count,reading_recognition,listening_recognition,recall_score,productive_score,created_at,updated_at) VALUES (?,?,0,0,0,0,0,?,?,?)",
    ).run("u", "lex_be", WORLD_MASTERY_THRESHOLD, now, now);

    const progress = recomputeWorldMastery(db, "u", worldId, new Date(now));
    expect(progress.masteryScore).toBeCloseTo(0.5);
  });

  it("preserves bossChallengeCompleted across recomputation", () => {
    const db = seededDb();
    const worldId = new SqliteWorldRepository(db).getByKey("en", "everyday-life")!.id;
    recomputeWorldMastery(db, "u", worldId, new Date(now));

    const progressRepo = new SqliteWorldProgressRepository(db);
    const current = progressRepo.get("u", worldId)!;
    progressRepo.upsert({ ...current, bossChallengeCompleted: true });

    const recomputed = recomputeWorldMastery(db, "u", worldId, new Date("2026-01-02T00:00:00.000Z"));
    expect(recomputed.bossChallengeCompleted).toBe(true);
  });
});

describe("listWorldsWithProgress", () => {
  it("pairs every seeded world with the learner's progress row (or null)", () => {
    const db = seededDb();
    const worldId = new SqliteWorldRepository(db).getByKey("en", "travel")!.id;
    recomputeWorldMastery(db, "u", worldId, new Date(now));

    const listed = listWorldsWithProgress(db, "u", "en");
    expect(listed).toHaveLength(3);
    const travel = listed.find((w) => w.world.key === "travel");
    expect(travel?.progress).not.toBeNull();
    const everydayLife = listed.find((w) => w.world.key === "everyday-life");
    expect(everydayLife?.progress).toBeNull();
  });
});
