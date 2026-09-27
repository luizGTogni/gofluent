// Local-only v1, same as quests and badges: oxygen count and owned spacesuit pieces live on this
// device for now. Coins and crystals themselves stay in the synced Wallet (economyStore.ts).
import type { SuitId } from "./shop";

const OXYGEN_KEY = "gofluent:oxygen";
const SUITS_KEY = "gofluent:suits";

export function getOxygen(): number {
  try {
    return Number(localStorage.getItem(OXYGEN_KEY) ?? "0");
  } catch {
    return 0;
  }
}

export function addOxygen(n: number): number {
  const next = getOxygen() + n;
  try {
    localStorage.setItem(OXYGEN_KEY, String(next));
  } catch {
    /* storage unavailable */
  }
  return next;
}

/** Consumes one oxygen tank if there is one. Returns whether it actually had one to spend. */
export function useOxygen(): boolean {
  const cur = getOxygen();
  if (cur <= 0) return false;
  try {
    localStorage.setItem(OXYGEN_KEY, String(cur - 1));
  } catch {
    /* storage unavailable */
  }
  return true;
}

export function ownedSuits(): Set<SuitId> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SUITS_KEY) ?? "[]") as SuitId[]);
  } catch {
    return new Set();
  }
}

export function buySuit(id: SuitId): Set<SuitId> {
  const set = ownedSuits();
  set.add(id);
  try {
    localStorage.setItem(SUITS_KEY, JSON.stringify([...set]));
  } catch {
    /* storage unavailable */
  }
  return set;
}
