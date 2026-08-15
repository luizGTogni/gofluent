import { describe, expect, it } from "vitest";
import { openDatabase, runMigrations } from "@gofluent/db";
import { PLACEMENT_QUESTIONS, runPlacementAssessment, scorePlacement } from "./placement.js";

const now = "2026-01-01T00:00:00.000Z";

describe("scorePlacement", () => {
  it("estimates A1 with no correct answers", () => {
    const score = scorePlacement([]);
    expect(score.correctCount).toBe(0);
  });

  it("estimates a higher CEFR level as more questions are answered correctly", () => {
    const allCorrect = PLACEMENT_QUESTIONS.map((q) => ({ questionId: q.id, selectedOptionIndex: q.correctOptionIndex }));
    const score = scorePlacement(allCorrect);
    expect(score.estimatedCefr).toBe("C2");
    expect(score.correctCount).toBe(PLACEMENT_QUESTIONS.length);
  });

  it("stops estimating past the first level with under half correct", () => {
    const onlyA1Correct = PLACEMENT_QUESTIONS.filter((q) => q.cefr === "A1").map((q) => ({ questionId: q.id, selectedOptionIndex: q.correctOptionIndex }));
    const score = scorePlacement(onlyA1Correct);
    expect(score.estimatedCefr).toBe("A1");
  });
});

describe("runPlacementAssessment", () => {
  it("persists lexeme state and profile estimates atomically", () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
    db.prepare("INSERT INTO learner_profiles (id,user_id,native_language,target_language,daily_minutes,onboarding_completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run("p", "u", "pt", "en", 20, 0, now, now);

    const answers = PLACEMENT_QUESTIONS.slice(0, 4).map((q) => ({ questionId: q.id, selectedOptionIndex: q.correctOptionIndex }));
    const { score } = runPlacementAssessment(db, { userId: "u", answers, now: new Date(now) });

    expect(score.correctCount).toBe(4);
    const stateCount = (db.prepare("SELECT count(*) AS count FROM learner_lexeme_state WHERE learner_id=?").get("u") as { count: number }).count;
    expect(stateCount).toBe(PLACEMENT_QUESTIONS.length);

    const profileRow = db.prepare("SELECT * FROM learner_profiles WHERE user_id=?").get("u") as Record<string, unknown>;
    expect(profileRow.onboarding_completed).toBe(1);
    expect(profileRow.estimated_cefr).toBeTruthy();
  });
});
