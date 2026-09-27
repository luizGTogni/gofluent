// Kept dependency-free so scripts can load it directly.
import { addDays, utcDay } from "./streak";

export type QuestPeriod = "daily" | "weekly";

export type QuestDef = {
  id: string;
  period: QuestPeriod;
  name: string;
  description: string;
  target: number;
  coins: number;
  crystals?: number;
};

/**
 * The mission board, v1: three quick daily missions and three weekly ones, each tied to a signal
 * the app already tracks. Surprise missions, error-pattern-personalized missions and the weekend
 * "meteor shower" double-XP event are intentionally not here yet — they need a few more design
 * calls (when a surprise should fire, which grammar patterns count, what a "month's saga" is)
 * before they're worth building.
 */
export const QUESTS: QuestDef[] = [
  { id: "d_ten_phrases", period: "daily", name: "Ten in a row", description: "Complete 10 phrases today.", target: 10, coins: 15 },
  { id: "d_five_streak", period: "daily", name: "Clean streak", description: "Get 5 phrases right in a row, no hints.", target: 5, coins: 15 },
  { id: "d_review_eight", period: "daily", name: "Clear the backlog", description: "Work through 8 phrases flagged for review.", target: 8, coins: 15 },
  { id: "w_five_days", period: "weekly", name: "Show up", description: "Study on 5 different days this week.", target: 5, coins: 60, crystals: 1 },
  { id: "w_new_words", period: "weekly", name: "Word hoard", description: "Learn 30 new words this week.", target: 30, coins: 60, crystals: 1 },
  {
    id: "w_deep_practice",
    period: "weekly",
    name: "Deep practice",
    description: "Complete 20 phrases this week.",
    target: 20,
    coins: 60,
    crystals: 1,
  },
];

export const QUEST_BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

/** Monday (UTC) of the week containing `d` — the key a weekly quest's progress is filed under. */
export function weekKey(d: Date): string {
  const day = utcDay(d);
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 Sun .. 6 Sat
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

/** How many of the 7 days starting at `weekStart` are in `checkedDays`. */
export function daysStudiedInWeek(checkedDays: ReadonlySet<string>, weekStart: string): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (checkedDays.has(addDays(weekStart, i))) n++;
  return n;
}

export const periodKeyFor = (q: QuestDef, now: Date) => (q.period === "daily" ? utcDay(now) : weekKey(now));
