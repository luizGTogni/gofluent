import type { Word } from "./exercises";

export const DIFF_AFTER_WRONG = 5;

export type Difficulty = "easy" | "medium" | "hard" | "extreme";

export type DifficultyConfig = {
  label: string;
  blurb: string;
  scoreMult: number;
  /** Multiplies the "fast" threshold: higher levels get more time. */
  timeMult: number;
  showText: boolean;
  firstLetter: boolean;
  gaps: boolean;
  diff: boolean;
  replay: boolean;
};

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { label: "Easy", blurb: "See the full text and type along as you listen.", scoreMult: 1, timeMult: 1, showText: true, firstLetter: false, gaps: true, diff: true, replay: true },
  medium: { label: "Medium", blurb: "First-letter hints only. Listen closely.", scoreMult: 1.3, timeMult: 1.15, showText: false, firstLetter: true, gaps: true, diff: true, replay: true },
  hard: { label: "Hard", blurb: "Audio only. No text, no hints.", scoreMult: 1.6, timeMult: 1.3, showText: false, firstLetter: false, gaps: true, diff: true, replay: true },
  extreme: { label: "Extreme", blurb: "One listen. No gaps, no diff. Type the whole sentence.", scoreMult: 2.2, timeMult: 1.6, showText: false, firstLetter: false, gaps: false, diff: false, replay: false },
};

export const DIFFICULTIES = Object.keys(DIFFICULTY) as Difficulty[];

export type GapStatus = "idle" | "correct" | "wrong";
export type Tier = "perfect" | "great" | "good" | "keep";

export const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z']/g, "");

export type DiffOp = { t: "keep" | "del" | "add"; c: string };

/** Character diff between what was typed and the target word (LCS based). */
export function diffWord(input: string, target: string): DiffOp[] {
  const a = input.toLowerCase();
  const b = target.toLowerCase();
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ t: "keep", c: input[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ t: "del", c: input[i++] });
    } else {
      ops.push({ t: "add", c: target[j++] });
    }
  }
  while (i < a.length) ops.push({ t: "del", c: input[i++] });
  while (j < b.length) ops.push({ t: "add", c: target[j++] });
  return ops;
}

// Speed thresholds: tune here after playtesting.
export const BASE_MS = 1500;
export const PER_LETTER_MS = 300;

export const expectedMs = (words: Word[]) =>
  words.reduce((sum, x) => sum + BASE_MS + PER_LETTER_MS * norm(x.text).length, 0);

export type Result = {
  elapsedMs: number;
  typedErrors: number;
  emptyChecks: number;
  helped: boolean;
  missed: string[];
};

export function scoreExercise(words: Word[], r: Result, combo: number, difficulty: Difficulty): { tier: Tier; points: number } {
  const cfg = DIFFICULTY[difficulty];
  const expected = expectedMs(words) * cfg.timeMult;
  const fast = r.elapsedMs <= expected;
  let tier: Tier;
  if (r.helped) tier = "keep";
  else if (r.typedErrors === 0 && r.emptyChecks === 0 && fast) tier = "perfect";
  else if (r.elapsedMs <= expected * 1.6) tier = "great";
  else tier = "good";

  const tierMult: Record<Tier, number> = { perfect: 1.5, great: 1.2, good: 1, keep: 0.6 };
  const penalty = 1 - Math.min(0.5, 0.1 * (r.typedErrors + r.emptyChecks));
  const comboMult = 1 + Math.min(0.5, 0.1 * Math.max(0, combo - 1));
  const base = 100 * words.length * cfg.scoreMult;
  return { tier, points: Math.round(base * tierMult[tier] * penalty * comboMult) };
}

export const TIER_LABEL: Record<Tier, string> = {
  perfect: "Perfect",
  great: "Great",
  good: "Good",
  keep: "Keep going",
};

export const TIER_COPY: Record<Tier, string> = {
  perfect: "Clean and quick. Your fingers knew the way.",
  great: "Quick and steady. Nicely done.",
  good: "Steady wins. Every word counts.",
  keep: "Small steps deserve to be seen.",
};
