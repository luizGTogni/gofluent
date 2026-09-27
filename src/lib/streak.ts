// Kept dependency-free so scripts can load it directly.

/**
 * The learner's IANA time zone. Days (streaks, quests, the heatmap) and hours (Early Bird,
 * Night Owl) are all read on this one clock, so "today" means the learner's today, not UTC's.
 * Undefined means the runtime's own zone, which in the browser is already the learner's.
 */
let zone: string | undefined;

/** The browser's time zone, e.g. "America/Sao_Paulo". */
export const browserTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

/** Switches the clock to `tz`; an unknown zone is ignored rather than breaking every date. */
export function setTimeZone(tz: string | undefined): void {
  if (!tz) return;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    zone = tz;
  } catch {
    /* invalid zone: keep the current one */
  }
}

const clock = (d: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "00";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
};

/** The learner's calendar day as YYYY-MM-DD. */
export const localDay = (d: Date) => clock(d).day;

/** The learner's hour of the day, 0..23. */
export const localHour = (d: Date) => clock(d).hour;

// Day strings are plain calendar dates, so arithmetic on them is done at UTC midnight (no DST).
const DAY_MS = 86_400_000;
export const addDays = (day: string, n: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / DAY_MS);

export type StreakResult = { current: number; longest: number };

/**
 * Consecutive days ending today (or yesterday, if today has no check-in yet — studying later
 * today should not have already reset the count). A day in `frozen` counts as covered, so one
 * missed day surrounded by check-ins does not break the streak.
 */
export function computeStreak(checkedDays: ReadonlySet<string>, frozenDays: ReadonlySet<string>, today: string): StreakResult {
  const covered = (day: string) => checkedDays.has(day) || frozenDays.has(day);
  let cursor = checkedDays.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (covered(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  // Longest streak ever, from the same data (only known days, so this is a lower bound on paper,
  // but exact for everything the app has recorded).
  const all = [...checkedDays, ...frozenDays].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of all) {
    run = prev && dayDiff(day, prev) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }
  return { current, longest: Math.max(longest, current) };
}

/** The single missing day a freeze would bridge, or null if there is no such gap to cover. */
export function gapToFreeze(checkedDays: ReadonlySet<string>, today: string): string | null {
  if (checkedDays.has(today) || checkedDays.size === 0) return null;
  const yesterday = addDays(today, -1);
  if (checkedDays.has(yesterday)) return null; // no gap yet, nothing to bridge
  const gapDay = yesterday;
  return checkedDays.has(addDays(gapDay, -1)) ? gapDay : null; // only a single-day gap is bridgeable
}

export const MILESTONES = [7, 30, 100, 365] as const;

/** The highest milestone newly reached going from `before` to `after` days, or null. */
export const milestoneHit = (before: number, after: number): number | null => MILESTONES.filter((m) => before < m && after >= m).at(-1) ?? null;
