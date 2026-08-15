import type { Encounter, LearningSession } from "@gofluent/core";
import {
  SqliteEncounterRepository, SqliteLearningSessionRepository, SqliteWorldProgressRepository, SqliteWorldRepository,
  type DatabaseSync,
} from "@gofluent/db";
import type { World, WorldProgress } from "@gofluent/core";

/**
 * Lightweight gamification (ROADMAP Phase 6, PRD §28): streak, journey
 * completion, repertoire growth, world/topic mastery, personal bests. XP is
 * intentionally absent — PRD §28 says it must not be the primary metric, and
 * every mechanic here is derivable from data the app already records
 * (ARCHITECTURE.md §55 "derived from observed data where possible"), so
 * there is no separate gamification event log or XP ledger to keep in sync.
 */
export interface StreakInfo { currentStreak: number; longestStreak: number; }

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const isoDate = (iso: string): string => iso.slice(0, 10);
const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T00:00:00.000Z`) - Date.parse(`${a}T00:00:00.000Z`)) / MS_PER_DAY);

/** `completedDates` are "YYYY-MM-DD" strings; duplicates/unsorted input is fine. */
export function computeStreakInfo(completedDates: string[], now: Date = new Date()): StreakInfo {
  const unique = [...new Set(completedDates)].sort();
  if (unique.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const gap = daysBetween(unique[i - 1] as string, unique[i] as string);
    run = gap === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  const today = isoDate(now.toISOString());
  const yesterday = isoDate(new Date(now.getTime() - MS_PER_DAY).toISOString());
  const last = unique[unique.length - 1] as string;

  let currentStreak = 0;
  if (last === today || last === yesterday) {
    currentStreak = 1;
    for (let i = unique.length - 1; i > 0; i -= 1) {
      if (daysBetween(unique[i - 1] as string, unique[i] as string) === 1) currentStreak += 1;
      else break;
    }
  }

  return { currentStreak, longestStreak };
}

export function completedJourneyDates(sessions: LearningSession[]): string[] {
  return sessions.filter((s): s is LearningSession & { completedAt: string } => typeof s.completedAt === "string").map((s) => isoDate(s.completedAt));
}

/** Distinct items with a SUCCESS encounter since `sinceIso` — a simple, derived "repertoire growth" signal. */
export function repertoireGrowth(encounters: Encounter[], sinceIso: string): number {
  const cutoff = Date.parse(sinceIso);
  const seen = new Set<string>();
  for (const encounter of encounters) {
    if (encounter.result !== "SUCCESS") continue;
    if (Date.parse(encounter.createdAt) < cutoff) continue;
    seen.add(`${encounter.itemType}:${encounter.itemId}`);
  }
  return seen.size;
}

export interface PersonalBests { longestStreak: number; mostEncountersInADay: number; }

export function computePersonalBests(completedDates: string[], encounters: Encounter[]): PersonalBests {
  const { longestStreak } = computeStreakInfo(completedDates);
  const byDay = new Map<string, number>();
  for (const encounter of encounters) {
    const day = isoDate(encounter.createdAt);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return { longestStreak, mostEncountersInADay: byDay.size === 0 ? 0 : Math.max(...byDay.values()) };
}

export interface GamificationSummary {
  currentStreak: number;
  longestStreak: number;
  repertoireGrowth7d: number;
  mostEncountersInADay: number;
  worlds: Array<{ world: World; progress: WorldProgress | null }>;
}

const REPERTOIRE_WINDOW_DAYS = 7;
const SESSION_HISTORY_LIMIT = 400;
const ENCOUNTER_HISTORY_LIMIT = 2000;

export function getGamificationSummary(db: DatabaseSync, learnerId: string, language: string, now: Date = new Date()): GamificationSummary {
  const sessions = new SqliteLearningSessionRepository(db).listCompleted(learnerId, SESSION_HISTORY_LIMIT);
  const encounters = new SqliteEncounterRepository(db).listRecent(learnerId, ENCOUNTER_HISTORY_LIMIT);
  const dates = completedJourneyDates(sessions);

  const streak = computeStreakInfo(dates, now);
  const bests = computePersonalBests(dates, encounters);
  const sinceIso = new Date(now.getTime() - REPERTOIRE_WINDOW_DAYS * MS_PER_DAY).toISOString();

  const worldRepo = new SqliteWorldRepository(db);
  const progressRepo = new SqliteWorldProgressRepository(db);
  const worlds = worldRepo.listAll(language).map((world) => ({ world, progress: progressRepo.get(learnerId, world.id) }));

  return {
    currentStreak: streak.currentStreak,
    longestStreak: bests.longestStreak,
    repertoireGrowth7d: repertoireGrowth(encounters, sinceIso),
    mostEncountersInADay: bests.mostEncountersInADay,
    worlds,
  };
}
