// Reads oxygen tanks. The cache keeps the latest count so Survival can decide synchronously;
// buying and spending go through the ledger (ledger.ts).
import { getSupabase } from "./supabase";
import { KEYS, readJson, writeJson } from "./localCache";

export const getOxygen = (): number => Number(readJson(KEYS.oxygen, 0)) || 0;

export async function loadInventory(): Promise<{ oxygen: number }> {
  const db = await getSupabase();
  if (!db) return { oxygen: getOxygen() };
  const { data, error } = await db.from("inventory").select("oxygen").maybeSingle();
  if (error) return { oxygen: getOxygen() };
  const oxygen = Number(data?.oxygen ?? 0);
  writeJson(KEYS.oxygen, oxygen);
  return { oxygen };
}
