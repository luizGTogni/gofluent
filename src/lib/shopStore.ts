// Oxygen tanks and owned spacesuit pieces, synced like the wallet: localStorage caches the latest
// values (so Survival can spend a tank synchronously), Supabase's inventory row holds the truth.
import type { SuitId } from "./shop";
import { getSupabase } from "./supabase";

const OXYGEN_KEY = "gofluent:oxygen";
const SUITS_KEY = "gofluent:suits";
const IMPORTED = "gofluent:inventory:imported";

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};

export function getOxygen(): number {
  try {
    return Number(localStorage.getItem(OXYGEN_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

export function ownedSuits(): Set<SuitId> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SUITS_KEY) ?? "[]") as SuitId[]);
  } catch {
    return new Set();
  }
}

const saveRemote = async (fields: { oxygen?: number; suits?: SuitId[] }) => {
  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db
    .from("inventory")
    .upsert({ user_id: data.user.id, ...fields, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) console.error("inventory save failed:", error.message);
};

type Inventory = { oxygen: number; suits: Set<SuitId> };

// Loads in flight are shared: the one-time import adds tanks, so two overlapping loads must not both run it.
let loading: Promise<Inventory> | null = null;

/** Pulls oxygen and suits; on the first signed-in load, merges in what this device had once. */
export function loadInventory(): Promise<Inventory> {
  loading ??= fetchInventory().finally(() => (loading = null));
  return loading;
}

async function fetchInventory(): Promise<Inventory> {
  const local = { oxygen: getOxygen(), suits: ownedSuits() };
  const db = await getSupabase();
  if (!db) return local;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return local;
  const { data, error } = await db.from("inventory").select("oxygen, suits").maybeSingle();
  if (error) return local;

  let oxygen = Number(data?.oxygen ?? 0);
  let suits = new Set((data?.suits ?? []) as SuitId[]);
  if (localStorage.getItem(IMPORTED) !== "1") {
    // Purchases made on this device before sync existed are added, never lost.
    oxygen += local.oxygen;
    suits = new Set([...suits, ...local.suits]);
    if (local.oxygen || local.suits.size) await saveRemote({ oxygen, suits: [...suits] });
    write(IMPORTED, "1");
  }
  write(OXYGEN_KEY, String(oxygen));
  write(SUITS_KEY, JSON.stringify([...suits]));
  return { oxygen, suits };
}

export function addOxygen(n: number): number {
  const next = getOxygen() + n;
  write(OXYGEN_KEY, String(next));
  saveRemote({ oxygen: next });
  return next;
}

/** Consumes one oxygen tank if there is one. Returns whether it actually had one to spend. */
export function useOxygen(): boolean {
  const cur = getOxygen();
  if (cur <= 0) return false;
  write(OXYGEN_KEY, String(cur - 1));
  saveRemote({ oxygen: cur - 1 });
  return true;
}

export function buySuit(id: SuitId): Set<SuitId> {
  const set = ownedSuits();
  set.add(id);
  write(SUITS_KEY, JSON.stringify([...set]));
  saveRemote({ suits: [...set] });
  return set;
}
