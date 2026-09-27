// The orbit calendar, kept pure: grid geometry, intensity, labels and summaries. Days are the
// learner's calendar days (YYYY-MM-DD, see streak.ts); weeks start on Monday, like weekKey.
import { milestoneReward } from "./economy";
import { addDays, MILESTONES } from "./streak";

/** What a day held: phrases finished and XP earned. Days recorded before this was tracked are 0/0. */
export type DayVolume = { phrases: number; xp: number };

/** 0 = Monday … 6 = Sunday. */
export const mondayIndex = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

/**
 * `weeks` columns of 7 days, Monday first, the last column being the current week (so today is
 * always in it). Days after today are still returned — the grid draws them as upcoming.
 */
export function gridWeeks(today: string, weeks: number): string[][] {
  const start = addDays(today, -(weeks - 1) * 7 - mondayIndex(today));
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

/** `count` days around today, oldest first: the last `past` days, today, and the rest upcoming. */
export const daysAround = (today: string, past: number, count: number) => Array.from({ length: count }, (_, i) => addDays(today, i - past));

/**
 * Intensity 0–4 from the phrases finished that day: 1–4, 5–9, 10–19, 20+. A studied day with no
 * recorded volume (from before it was tracked) counts as level 1.
 */
export function intensity(studied: boolean, v: DayVolume | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!studied) return 0;
  const n = v?.phrases ?? 0;
  return n >= 20 ? 4 : n >= 10 ? 3 : n >= 5 ? 2 : 1;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Monday first, like the grid. */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A month label for each column: set only on the column holding that month's 1st (or the first column). */
export const monthLabels = (weeks: string[][]): (string | null)[] =>
  weeks.map((week, w) => {
    const first = week.find((d) => d.endsWith("-01"));
    const day = first ?? (w === 0 ? week[0] : null);
    return day ? MONTHS[Number(day.slice(5, 7)) - 1] : null;
  });

const LONG_DATE = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const SHORT_DATE = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", timeZone: "UTC" });

/** "Sunday, September 27" */
export const longDate = (day: string) => LONG_DATE.format(new Date(`${day}T12:00:00Z`));
/** "September 27" */
export const shortDate = (day: string) => SHORT_DATE.format(new Date(`${day}T12:00:00Z`));

/** The first recorded day (studied or shielded), or null with no history. */
export const firstDay = (checked: ReadonlySet<string>, frozen: ReadonlySet<string>): string | null => [...checked, ...frozen].sort()[0] ?? null;

/** Days from the first recorded day (studied or shielded) to today, inclusive; 0 with no history. */
export function historyDays(checked: ReadonlySet<string>, frozen: ReadonlySet<string>, today: string): number {
  const first = firstDay(checked, frozen);
  if (!first) return 0;
  return Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${first}T00:00:00Z`).getTime()) / 86_400_000) + 1;
}

export type NextMilestone = { target: number; left: number; pct: number; reward: ReturnType<typeof milestoneReward> };

/** The next orbit milestone above `streak`, how far it is, and what it pays; null past the last one. */
export function nextMilestone(streak: number): NextMilestone | null {
  const i = MILESTONES.findIndex((m) => m > streak);
  if (i === -1) return null;
  const target = MILESTONES[i];
  const from = i === 0 ? 0 : MILESTONES[i - 1];
  return { target, left: target - streak, pct: Math.round(((streak - from) / (target - from)) * 100), reward: milestoneReward(target) };
}

/**
 * Where `streak` sits on the milestone track, 0–100: the start and each milestone are evenly
 * spaced (0, 7, 30, 100, 365 at 0/25/50/75/100%), and the streak moves linearly within a segment.
 */
export function trackPosition(streak: number): number {
  const stops = [0, ...MILESTONES];
  const i = stops.findIndex((m) => m > streak);
  if (i === -1) return 100;
  const seg = 100 / MILESTONES.length;
  return (i - 1) * seg + ((streak - stops[i - 1]) / (stops[i] - stops[i - 1])) * seg;
}

export type OrbitSummary = { thisMonth: number; total: number; avgPhrases: number | null };

/** Days studied this month and overall, and phrases per active day (over days whose volume is known). */
export function orbitSummary(checked: ReadonlySet<string>, volume: ReadonlyMap<string, DayVolume>, today: string): OrbitSummary {
  const month = today.slice(0, 7);
  const known = [...checked].map((d) => volume.get(d)?.phrases ?? 0).filter((n) => n > 0);
  return {
    thisMonth: [...checked].filter((d) => d.startsWith(month)).length,
    total: checked.size,
    avgPhrases: known.length ? Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10 : null,
  };
}
