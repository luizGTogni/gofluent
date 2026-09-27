// Reads XP and rank points. Every write goes through the ledger (ledger.ts).
import { emptyPlayer, fromOldCurve, type PlayerState } from "./xp";
import { getSupabase } from "./supabase";
import { KEYS, readJson, writeJson } from "./localCache";

/** The cached player; one saved under the old level curve is converted (and re-saved) on first read. */
export function cachedPlayer(): PlayerState {
  const current = readJson<Partial<PlayerState> | null>(KEYS.player, null);
  if (current) return { ...emptyPlayer, ...current };
  const old = readJson<Partial<PlayerState> | null>(KEYS.playerV1, null);
  if (!old) return emptyPlayer;
  const p = { ...emptyPlayer, ...old };
  const player = { ...p, xp: fromOldCurve(p.xp), rp: fromOldCurve(p.rp) };
  writeJson(KEYS.player, player);
  return player;
}

export async function loadPlayer(): Promise<PlayerState> {
  const db = await getSupabase();
  if (!db) return cachedPlayer();
  const { data, error } = await db.from("player_stats").select("xp, rp, last_active_at").maybeSingle();
  if (error) return cachedPlayer();
  const player = data ? { xp: Number(data.xp), rp: Number(data.rp), lastActiveAt: data.last_active_at as string | null } : emptyPlayer;
  writeJson(KEYS.player, player);
  return player;
}
