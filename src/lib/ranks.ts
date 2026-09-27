import { TITLES, type Title } from "./titles";
import { levelFromXp, totalXpForLevel, type PlayerState } from "./xp";

export * from "./titles";

export type Rank = { index: number; title: Title; stars: 1 | 2 | 3 };

/** Title and stars for a level. Each title's levels are split into thirds. */
export function rankForLevel(level: number): Rank {
  const index = Math.max(0, TITLES.findIndex((t) => level >= t.from && level <= t.to));
  const title = TITLES[index];
  const stars = Number.isFinite(title.to)
    ? Math.min(3, Math.floor(((level - title.from) * 3) / (title.to - title.from + 1)) + 1)
    : Math.min(3, 1 + Math.floor((level - title.from) / 25));
  return { index, title, stars: stars as 1 | 2 | 3 };
}

export const starsLabel = (stars: number) => "★".repeat(stars) + "☆".repeat(3 - stars);

/** The rank the learner currently holds, from rank points. */
export const rankOf = (rp: number): Rank => rankForLevel(levelFromXp(rp));

/** How far rank points `rp` are from the title at `index`: XP still to earn, and the share covered. */
export function rankGoal(rp: number, index: number): { title: Title; xpLeft: number; pct: number } {
  const title = TITLES[index];
  const target = totalXpForLevel(title.from);
  return { title, xpLeft: Math.max(0, Math.ceil(target - rp)), pct: target > 0 ? Math.min(100, Math.round((rp / target) * 100)) : 100 };
}

export type RankChange = "promotion" | "star" | null;

export function rankChange(before: Rank, after: Rank): RankChange {
  if (after.index > before.index) return "promotion";
  if (after.index === before.index && after.stars > before.stars) return "star";
  return null;
}

// ---- inactivity ----
export const GRACE_DAYS = 3;
export const DAYS_PER_STAR = 7;
/** Fading is gentle: at most about one title's worth of stars, so getting back is always possible. */
export const MAX_STARS_LOST = 3;
const DAY_MS = 86_400_000;

export function idleDays(lastActiveAt: string | null, now: Date): number {
  if (!lastActiveAt) return 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(lastActiveAt).getTime()) / DAY_MS));
}

/**
 * Rank points after inactivity: after a 3-day grace, one star fades per further week away.
 * Pure and repeatable (never persisted on load), so opening the app twice can't fade it twice.
 */
export function effectiveRp(p: PlayerState, now: Date): number {
  const lost = Math.min(MAX_STARS_LOST, Math.floor(Math.max(0, idleDays(p.lastActiveAt, now) - GRACE_DAYS) / DAYS_PER_STAR));
  let level = levelFromXp(p.rp);
  for (let i = 0; i < lost && level > 0; i++) {
    const { title } = rankForLevel(level);
    const span = Number.isFinite(title.to) ? title.to - title.from + 1 : 75;
    level = Math.max(0, level - Math.ceil(span / 3));
  }
  return Math.min(p.rp, totalXpForLevel(level));
}
