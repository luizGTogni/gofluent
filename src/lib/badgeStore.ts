import type { BadgeId } from "./badges";

const BADGES_KEY = "gofluent:badges";
const NO_HINT_KEY = "gofluent:noHintCount";

export function unlockedBadges(): Set<BadgeId> {
  try {
    return new Set(JSON.parse(localStorage.getItem(BADGES_KEY) ?? "[]") as BadgeId[]);
  } catch {
    return new Set();
  }
}

export function unlockBadge(id: BadgeId): void {
  const set = unlockedBadges();
  if (set.has(id)) return;
  set.add(id);
  try {
    localStorage.setItem(BADGES_KEY, JSON.stringify([...set]));
  } catch {
    /* storage unavailable: badge just won't persist offline */
  }
}

/** Lifetime count of phrases finished without a hint — the counter "No Hints, 100 Phrases" watches. */
export function bumpNoHintCount(): number {
  let n = 0;
  try {
    n = Number(localStorage.getItem(NO_HINT_KEY) ?? "0") + 1;
    localStorage.setItem(NO_HINT_KEY, String(n));
  } catch {
    /* storage unavailable: counter just won't persist offline */
  }
  return n;
}
