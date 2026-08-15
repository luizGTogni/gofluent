import { describe, expect, it } from "vitest";
import type { BossChallengeAttempt, WorldProgress } from "@gofluent/core";
import { openDatabase } from "./sqlite/connection.js";
import { runMigrations } from "./migrations/migrate.js";
import { seedBossChallenges, seedWorlds } from "./seed.js";
import { SqliteBossChallengeAttemptRepository, SqliteBossChallengeRepository, SqliteWorldProgressRepository, SqliteWorldRepository } from "./repositories.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  seedWorlds(new SqliteWorldRepository(db), now);
  seedBossChallenges(new SqliteBossChallengeRepository(db), now);
  return db;
}

describe("SqliteWorldProgressRepository", () => {
  it("upserts and reads back mastery/completion state", () => {
    const db = seededDb();
    const repo = new SqliteWorldProgressRepository(db);
    const worldId = new SqliteWorldRepository(db).getByKey("en", "everyday-life")!.id;

    const progress: WorldProgress = { learnerId: "u", worldId, masteryScore: 0.5, bossChallengeCompleted: false, createdAt: now, updatedAt: now };
    repo.upsert(progress);
    expect(repo.get("u", worldId)?.masteryScore).toBe(0.5);

    const later = "2026-01-02T00:00:00.000Z";
    repo.upsert({ ...progress, masteryScore: 1.0, bossChallengeCompleted: true, lastActivityAt: later, updatedAt: later });
    const updated = repo.get("u", worldId);
    expect(updated?.masteryScore).toBe(1.0);
    expect(updated?.bossChallengeCompleted).toBe(true);

    expect(repo.listByLearner("u")).toHaveLength(1);
  });
});

describe("SqliteBossChallengeAttemptRepository", () => {
  it("records attempts and finds the best-scoring one for a challenge", () => {
    const db = seededDb();
    const repo = new SqliteBossChallengeAttemptRepository(db);
    const challengeId = new SqliteBossChallengeRepository(db).getByKey(
      new SqliteWorldRepository(db).getByKey("en", "travel")!.id,
      "airport-check-in",
    )!.id;

    const weak: BossChallengeAttempt = {
      id: "a1", learnerId: "u", bossChallengeId: challengeId, taskCompletion: 0.3, comprehension: 0.3,
      targetPhraseUsage: 0.2, abilityToContinue: 0.3, result: "PARTIAL", createdAt: now,
    };
    const strong: BossChallengeAttempt = {
      id: "a2", learnerId: "u", bossChallengeId: challengeId, taskCompletion: 0.9, comprehension: 0.8,
      targetPhraseUsage: 0.85, abilityToContinue: 0.9, result: "SUCCESS", feedback: "Great job!", createdAt: "2026-01-02T00:00:00.000Z",
    };
    repo.insert(weak);
    repo.insert(strong);

    expect(repo.listByLearner("u", 10)).toHaveLength(2);
    expect(repo.bestForChallenge("u", challengeId)?.id).toBe("a2");
  });
});
