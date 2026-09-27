import { DIFFICULTY, expectedMs, type Difficulty, type Result } from "./engine";
import type { Word } from "./exercises";

/** XP to go from `level` to `level + 1`. Tune the curve here. */
export const xpForLevel = (level: number) => 500 + 150 * level;

/** Total XP needed to reach `level`. */
export const totalXpForLevel = (level: number) => 500 * level + 75 * level * (level - 1);

/**
 * Points earned under the first, much cheaper curve (50 + 12·level), moved onto this one at the
 * same level and the same share of the way to the next, so the change costs nobody a level.
 * Mirrored in supabase/migrations/0022_slower_levels.sql.
 */
export function fromOldCurve(points: number): number {
  const oldTotal = (l: number) => 50 * l + 6 * l * (l - 1);
  let level = 0;
  while (oldTotal(level + 1) <= points) level++;
  const share = (points - oldTotal(level)) / (50 + 12 * level);
  return totalXpForLevel(level) + Math.floor(share * xpForLevel(level));
}

export function levelFromXp(xp: number): number {
  let level = 0;
  while (totalXpForLevel(level + 1) <= xp) level++;
  return level;
}

export type LevelProgress = { level: number; into: number; need: number; pct: number };

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const into = xp - totalXpForLevel(level);
  const need = xpForLevel(level);
  return { level, into, need, pct: Math.min(100, Math.round((into / need) * 100)) };
}

/** How far `points` are from `level`: XP still to earn, and the share covered. */
export function levelGoal(points: number, level: number): { xpLeft: number; pct: number } {
  const target = totalXpForLevel(level);
  return { xpLeft: Math.max(0, Math.ceil(target - points)), pct: target > 0 ? Math.min(100, Math.round((points / target) * 100)) : 100 };
}

export type XpBreakdown = { base: number; firstTry: number; fast: number; noHelp: number; comeback: number; mult: number; total: number; answerShown: boolean };

const PER_WORD = 3;

/**
 * XP for one finished phrase: base by length (given for any finish of your own — effort and
 * progress count, not just a clean run), plus bonuses for first try, speed, no hints, and — when
 * `cameBack` is set — for finally nailing a phrase that had tripped you up before. Learning from a
 * mistake pays more than a phrase that was never missed. Once the diff showed the answer (`helped`),
 * the phrase pays nothing: copying it out isn't solving it.
 */
export function phraseXp(words: Word[], r: Result, difficulty: Difficulty, cameBack = false): XpBreakdown {
  const cfg = DIFFICULTY[difficulty];
  if (r.helped) return { base: 0, firstTry: 0, fast: 0, noHelp: 0, comeback: 0, mult: cfg.scoreMult, total: 0, answerShown: true };
  const base = PER_WORD * words.length;
  const firstTry = r.typedErrors === 0 && r.emptyChecks === 0 ? Math.round(base * 0.5) : 0;
  const fast = r.elapsedMs <= expectedMs(words) * cfg.timeMult ? Math.round(base * 0.25) : 0;
  const noHelp = Math.round(base * 0.25);
  const comeback = cameBack ? Math.round(base * 0.5) : 0;
  const total = Math.round((base + firstTry + fast + noHelp + comeback) * cfg.scoreMult);
  return { base, firstTry, fast, noHelp, comeback, mult: cfg.scoreMult, total, answerShown: false };
}

// ---- player state: lifetime XP never drops; rank points (RP) can fade with inactivity ----

export type PlayerState = { xp: number; rp: number; lastActiveAt: string | null };

export const emptyPlayer: PlayerState = { xp: 0, rp: 0, lastActiveAt: null };

/** Adds XP. Rank points follow XP, and catch up twice as fast while they trail it. */
export function addXp(p: PlayerState, gain: number, now: Date): PlayerState {
  const xp = p.xp + gain;
  const rp = Math.min(xp, p.rp + (p.rp < p.xp ? gain * 2 : gain));
  return { xp, rp, lastActiveAt: now.toISOString() };
}
