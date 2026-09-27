// v1 is local-only (per device), same as browser-storage-backed conveniences elsewhere: quest
// progress resets if you switch devices. Worth a Supabase table later if that turns out to matter.

export type QuestProgress = { id: string; periodKey: string; count: number; claimed: boolean };

const KEY = "gofluent:quests";

const readAll = (): QuestProgress[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QuestProgress[];
  } catch {
    return [];
  }
};

const writeAll = (rows: QuestProgress[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* storage unavailable: quests just won't persist offline */
  }
};

export function getProgress(id: string, periodKey: string): QuestProgress {
  return readAll().find((r) => r.id === id && r.periodKey === periodKey) ?? { id, periodKey, count: 0, claimed: false };
}

/** Adds `delta` to the current count for this quest's period, capped at `cap`. */
export function bumpQuest(id: string, periodKey: string, delta: number, cap: number): QuestProgress {
  const prev = getProgress(id, periodKey);
  const next: QuestProgress = { ...prev, count: Math.min(cap, prev.count + delta) };
  writeAll([...readAll().filter((r) => !(r.id === id && r.periodKey === periodKey)), next]);
  return next;
}

/** Sets the count directly (for quests derived from other state, like days studied this week). */
export function setProgress(id: string, periodKey: string, count: number, cap: number): QuestProgress {
  const prev = getProgress(id, periodKey);
  const next: QuestProgress = { ...prev, count: Math.min(cap, count) };
  writeAll([...readAll().filter((r) => !(r.id === id && r.periodKey === periodKey)), next]);
  return next;
}

export function markClaimed(id: string, periodKey: string): void {
  const prev = getProgress(id, periodKey);
  writeAll([...readAll().filter((r) => !(r.id === id && r.periodKey === periodKey)), { ...prev, claimed: true }]);
}

/** All progress rows for a period key, for rendering the board without one call per quest. */
export function allProgress(): QuestProgress[] {
  return readAll();
}
