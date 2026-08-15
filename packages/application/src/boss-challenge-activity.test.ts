import { describe, expect, it } from "vitest";
import { FakeProvider } from "@gofluent/ai";
import { openDatabase, runMigrations, seedBossChallenges, seedWorlds, SqliteBossChallengeRepository, SqliteWorldRepository } from "@gofluent/db";
import { evaluateBossChallengeAttempt } from "./boss-challenge-activity.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  seedWorlds(new SqliteWorldRepository(db), now);
  seedBossChallenges(new SqliteBossChallengeRepository(db), now);
  return db;
}

describe("evaluateBossChallengeAttempt", () => {
  it("persists a SUCCESS attempt and marks the world's boss challenge completed", async () => {
    const db = seededDb();
    const bossChallenge = new SqliteBossChallengeRepository(db).getByKey(
      new SqliteWorldRepository(db).getByKey("en", "travel")!.id,
      "airport-check-in",
    )!;
    const provider = new FakeProvider({
      responses: {
        boss_challenge_evaluation: [{
          taskCompletion: 0.9, comprehension: 0.85, targetPhraseUsage: 0.8, abilityToContinue: 0.9,
          result: "SUCCESS", feedback: "Excellent check-in!",
        }],
      },
    });

    const result = await evaluateBossChallengeAttempt(db, provider, "fake-model", {
      learnerId: "u", bossChallenge,
      transcript: [
        { speaker: "TUTOR", text: "Passport, please." },
        { speaker: "LEARNER", text: "Here is my passport." },
      ],
      now: new Date(now),
    });

    expect(result.attempt.result).toBe("SUCCESS");
    expect(result.worldProgress.bossChallengeCompleted).toBe(true);

    const row = db.prepare("SELECT * FROM boss_challenge_attempts WHERE learner_id='u'").get() as Record<string, unknown>;
    expect(row.boss_challenge_id).toBe(bossChallenge.id);

    const progressRow = db.prepare("SELECT * FROM world_progress WHERE learner_id='u' AND world_id=?").get(bossChallenge.worldId) as Record<string, unknown>;
    expect(progressRow.boss_challenge_completed).toBe(1);
  });

  it("does not mark the world completed on a FAIL result", async () => {
    const db = seededDb();
    const bossChallenge = new SqliteBossChallengeRepository(db).getByKey(
      new SqliteWorldRepository(db).getByKey("en", "everyday-life")!.id,
      "coffee-shop-order",
    )!;
    const provider = new FakeProvider({
      responses: {
        boss_challenge_evaluation: [{
          taskCompletion: 0.1, comprehension: 0.1, targetPhraseUsage: 0.1, abilityToContinue: 0.1,
          result: "FAIL", feedback: "Let's try that again.",
        }],
      },
    });

    const result = await evaluateBossChallengeAttempt(db, provider, "fake-model", {
      learnerId: "u", bossChallenge, transcript: [], now: new Date(now),
    });

    expect(result.attempt.result).toBe("FAIL");
    expect(result.worldProgress.bossChallengeCompleted).toBe(false);
  });
});
