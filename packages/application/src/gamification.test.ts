import { describe, expect, it } from "vitest";
import type { Encounter, LearningSession } from "@gofluent/core";
import { openDatabase, runMigrations, SqliteWorldRepository } from "@gofluent/db";
import { seedWorlds } from "@gofluent/db";
import { completedJourneyDates, computePersonalBests, computeStreakInfo, getGamificationSummary, repertoireGrowth } from "./gamification.js";

const now = "2026-01-10T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  seedWorlds(new SqliteWorldRepository(db), now);
  return db;
}

describe("computeStreakInfo", () => {
  it("returns zero streaks for no history", () => {
    expect(computeStreakInfo([], new Date(now))).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it("counts a run of consecutive days ending today as the current streak", () => {
    const result = computeStreakInfo(["2026-01-08", "2026-01-09", "2026-01-10"], new Date(now));
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it("still counts yesterday as an active streak (today not yet done)", () => {
    const result = computeStreakInfo(["2026-01-07", "2026-01-08", "2026-01-09"], new Date(now));
    expect(result.currentStreak).toBe(3);
  });

  it("resets current streak to zero after a gap, but keeps the historical longest streak", () => {
    const result = computeStreakInfo(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-05"], new Date(now));
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(3);
  });

  it("deduplicates repeated dates", () => {
    const result = computeStreakInfo(["2026-01-10", "2026-01-10", "2026-01-09"], new Date(now));
    expect(result.currentStreak).toBe(2);
  });
});

describe("completedJourneyDates", () => {
  it("extracts the calendar date of completed sessions and drops in-progress ones", () => {
    const sessions: LearningSession[] = [
      { id: "s1", learnerId: "u", sessionType: "DAILY_JOURNEY", status: "COMPLETED", completedAt: "2026-01-09T18:00:00.000Z", createdAt: now, updatedAt: now },
      { id: "s2", learnerId: "u", sessionType: "DAILY_JOURNEY", status: "IN_PROGRESS", createdAt: now, updatedAt: now },
    ];
    expect(completedJourneyDates(sessions)).toEqual(["2026-01-09"]);
  });
});

describe("repertoireGrowth", () => {
  it("counts distinct SUCCESS items since the cutoff, ignoring older or failed encounters", () => {
    const encounters: Encounter[] = [
      { id: "e1", learnerId: "u", itemType: "LEXEME", itemId: "a", modality: "READING", activity: "STORY", result: "SUCCESS", assistanceUsed: false, createdAt: "2026-01-09T00:00:00.000Z" },
      { id: "e2", learnerId: "u", itemType: "LEXEME", itemId: "a", modality: "READING", activity: "STORY", result: "SUCCESS", assistanceUsed: false, createdAt: "2026-01-09T01:00:00.000Z" },
      { id: "e3", learnerId: "u", itemType: "LEXEME", itemId: "b", modality: "READING", activity: "STORY", result: "FAIL", assistanceUsed: false, createdAt: "2026-01-09T00:00:00.000Z" },
      { id: "e4", learnerId: "u", itemType: "LEXEME", itemId: "c", modality: "READING", activity: "STORY", result: "SUCCESS", assistanceUsed: false, createdAt: "2025-12-01T00:00:00.000Z" },
    ];
    expect(repertoireGrowth(encounters, "2026-01-01T00:00:00.000Z")).toBe(1);
  });
});

describe("computePersonalBests", () => {
  it("reports the longest historical streak and the busiest single day", () => {
    const encounters: Encounter[] = [
      { id: "e1", learnerId: "u", itemType: "LEXEME", itemId: "a", modality: "READING", activity: "STORY", result: "SUCCESS", assistanceUsed: false, createdAt: "2026-01-09T00:00:00.000Z" },
      { id: "e2", learnerId: "u", itemType: "LEXEME", itemId: "b", modality: "READING", activity: "STORY", result: "SUCCESS", assistanceUsed: false, createdAt: "2026-01-09T01:00:00.000Z" },
      { id: "e3", learnerId: "u", itemType: "LEXEME", itemId: "c", modality: "READING", activity: "STORY", result: "SUCCESS", assistanceUsed: false, createdAt: "2026-01-10T00:00:00.000Z" },
    ];
    const bests = computePersonalBests(["2026-01-01", "2026-01-02", "2026-01-05"], encounters);
    expect(bests.longestStreak).toBe(2);
    expect(bests.mostEncountersInADay).toBe(2);
  });
});

describe("getGamificationSummary", () => {
  it("assembles streak, repertoire growth, and all seeded worlds (with null progress before any activity)", () => {
    const db = seededDb();
    const summary = getGamificationSummary(db, "u", "en", new Date(now));
    expect(summary.currentStreak).toBe(0);
    expect(summary.worlds).toHaveLength(3);
    expect(summary.worlds.every((w) => w.progress === null)).toBe(true);
  });
});
