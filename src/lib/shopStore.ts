// Oxygen tanks, synced like the wallet: localStorage caches the latest count (so Survival can spend
// a tank synchronously), Supabase's inventory row holds the truth.
import { getSupabase } from "./supabase";

const OXYGEN_KEY = "gofluent:oxygen";
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

const saveRemote = async (fields: { oxygen: number }) => {
  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db
    .from("inventory")
    .upsert({ user_id: data.user.id, ...fields, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) console.error("inventory save failed:", error.message);
};

type Inventory = { oxygen: number };

// Loads in flight are shared: the one-time import adds tanks, so two overlapping loads must not both run it.
let loading: Promise<Inventory> | null = null;

/** Pulls oxygen; on the first signed-in load, merges in what this device had once. */
export function loadInventory(): Promise<Inventory> {
  loading ??= fetchInventory().finally(() => (loading = null));
  return loading;
}

async function fetchInventory(): Promise<Inventory> {
  const local = { oxygen: getOxygen() };
  const db = await getSupabase();
  if (!db) return local;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return local;
  const { data, error } = await db.from("inventory").select("oxygen").maybeSingle();
  if (error) return local;

  let oxygen = Number(data?.oxygen ?? 0);
  if (localStorage.getItem(IMPORTED) !== "1") {
    // Purchases made on this device before sync existed are added, never lost.
    oxygen += local.oxygen;
    if (local.oxygen) await saveRemote({ oxygen });
    write(IMPORTED, "1");
  }
  write(OXYGEN_KEY, String(oxygen));
  return { oxygen };
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
