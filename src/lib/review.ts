export type ReviewState = {
  phrase: string;
  box: number;
  dueAt: string;
  reps: number;
  lapses: number;
};

// Minutes until the next review, by box. A miss sends the phrase back to box 0.
export const INTERVALS_MIN = [10, 1440, 4320, 10080, 20160, 43200];
const LAST_BOX = INTERVALS_MIN.length - 1;

const MS_MIN = 60_000;
const due = (now: Date, box: number) => new Date(now.getTime() + INTERVALS_MIN[box] * MS_MIN).toISOString();

/**
 * New state after an attempt. Returns undefined when nothing should be tracked:
 * a clean pass of a phrase that was never in review.
 */
export function afterAttempt(prev: ReviewState | undefined, success: boolean, phrase: string, now: Date): ReviewState | undefined {
  if (!prev) return success ? undefined : { phrase, box: 0, dueAt: due(now, 0), reps: 0, lapses: 1 };
  if (success) {
    const box = Math.min(prev.box + 1, LAST_BOX);
    return { ...prev, box, dueAt: due(now, box), reps: prev.reps + 1 };
  }
  return { ...prev, box: 0, dueAt: due(now, 0), lapses: prev.lapses + 1 };
}

/** Saving a chunk puts its sentence in review for tomorrow, unless already tracked. */
export const enrolled = (phrase: string, now: Date): ReviewState => ({ phrase, box: 1, dueAt: due(now, 1), reps: 0, lapses: 0 });

export const isDue = (s: ReviewState, now: Date) => new Date(s.dueAt).getTime() <= now.getTime();

export function dueList(states: Iterable<ReviewState>, now: Date): ReviewState[] {
  return [...states].filter((s) => isDue(s, now)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** "in 10 minutes", "tomorrow", "in 3 days"... */
export function whenLabel(iso: string, now: Date): string {
  const min = Math.max(1, Math.round((new Date(iso).getTime() - now.getTime()) / MS_MIN));
  if (min < 60) return `in ${min} minute${min === 1 ? "" : "s"}`;
  if (min < 1440) return `in ${Math.round(min / 60)} hours`;
  const days = Math.round(min / 1440);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}
