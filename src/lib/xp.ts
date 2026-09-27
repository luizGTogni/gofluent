import { DIFFICULTY, expectedMs, type Difficulty, type Result } from "./engine";
import type { Word } from "./exercises";

/** XP to go from `level` to `level + 1`. Tune the curve here. */
export const xpForLevel = (level: number) => 50 + 12 * level;

/** Total XP needed to reach `level`. */
export const totalXpForLevel = (level: number) => 50 * level + 6 * level * (level - 1);

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

export type XpBreakdown = { base: number; firstTry: number; fast: number; noHelp: number; mult: number; total: number };

const PER_WORD = 10;

/** XP for one finished phrase: base by length, plus bonuses for first try, speed and no hints. */
export function phraseXp(words: Word[], r: Result, difficulty: Difficulty): XpBreakdown {
  const cfg = DIFFICULTY[difficulty];
  const base = PER_WORD * words.length;
  const firstTry = r.typedErrors === 0 && r.emptyChecks === 0 ? Math.round(base * 0.5) : 0;
  const fast = r.elapsedMs <= expectedMs(words) * cfg.timeMult ? Math.round(base * 0.25) : 0;
  const noHelp = r.helped ? 0 : Math.round(base * 0.25);
  const total = Math.round((base + firstTry + fast + noHelp) * cfg.scoreMult);
  return { base, firstTry, fast, noHelp, mult: cfg.scoreMult, total };
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
