// Kept dependency-free so scripts can load it directly.
import type { GameMode } from "./modes";
import { addDays, localDay } from "./streak";

export type QuestPeriod = "daily" | "weekly";

export type QuestDef = {
  id: string;
  period: QuestPeriod;
  name: string;
  description: string;
  target: number;
  coins: number;
  crystals?: number;
  /** Mode missions only count in that mode, and stay locked until the mode is (see unlocks.ts). */
  mode?: GameMode;
};

/**
 * The mission board, v2. Each name says what the rule checks. Daily missions are quick and
 * different from the weekly ones (no "10 phrases today" next to "20 phrases this week"); the week
 * has one mission per Free mode and one for precision. A reached mission waits to be claimed.
 */
export const QUESTS: QuestDef[] = [
  { id: "d_full_flight", period: "daily", name: "Full flight", description: "Finish a Classic session, start to end.", target: 1, coins: 15, mode: "classic" },
  { id: "d_five_clean", period: "daily", name: "Five clean", description: "Get 5 phrases in a row without a typo.", target: 5, coins: 15 },
  { id: "d_review_eight", period: "daily", name: "Clear the backlog", description: "Work through 8 phrases flagged for review.", target: 8, coins: 15 },

  { id: "w_five_days", period: "weekly", name: "Five-day week", description: "Study on 5 different days this week.", target: 5, coins: 60, crystals: 1 },
  { id: "w_new_words", period: "weekly", name: "Word hoard", description: "Meet 30 words you haven't typed before.", target: 30, coins: 60, crystals: 1 },
  { id: "w_perfect", period: "weekly", name: "Sharpshooter", description: "Finish 15 phrases rated Perfect.", target: 15, coins: 60, crystals: 1 },
  { id: "w_time_attack", period: "weekly", name: "Beat the clock", description: "Solve 8 phrases in a single Time Attack run.", target: 8, coins: 60, crystals: 1, mode: "timeAttack" },
  { id: "w_survival", period: "weekly", name: "Survivor", description: "Reach 10 phrases in a single Survival run.", target: 10, coins: 60, crystals: 1, mode: "survival" },
  { id: "w_storm", period: "weekly", name: "Storm chaser", description: "Clear a Solar Storm.", target: 1, coins: 60, crystals: 1, mode: "boss" },
  { id: "w_blind", period: "weekly", name: "Eyes closed", description: "Finish 5 phrases in Blind Dictation.", target: 5, coins: 60, crystals: 1, mode: "blind" },
];

export const QUEST_BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

/** Monday (on the learner's clock) of the week containing `d` — the key a weekly quest's progress is filed under. */
export function weekKey(d: Date): string {
  const day = localDay(d);
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 Sun .. 6 Sat
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

/** How many of the 7 days starting at `weekStart` are in `checkedDays`. */
export function daysStudiedInWeek(checkedDays: ReadonlySet<string>, weekStart: string): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (checkedDays.has(addDays(weekStart, i))) n++;
  return n;
}

export const periodKeyFor = (q: QuestDef, now: Date) => (q.period === "daily" ? localDay(now) : weekKey(now));
