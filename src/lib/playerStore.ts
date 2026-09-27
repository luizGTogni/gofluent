// Reads XP and rank points. Every write goes through the ledger (ledger.ts).
import { emptyPlayer, type PlayerState } from "./xp";
import { getSupabase } from "./supabase";
import { KEYS, readJson, writeJson } from "./localCache";

const cached = (): PlayerState => ({ ...emptyPlayer, ...readJson<Partial<PlayerState>>(KEYS.player, {}) });

export async function loadPlayer(): Promise<PlayerState> {
  const db = await getSupabase();
  if (!db) return cached();
  const { data, error } = await db.from("player_stats").select("xp, rp, last_active_at").maybeSingle();
  if (error) return cached();
  const player = data ? { xp: Number(data.xp), rp: Number(data.rp), lastActiveAt: data.last_active_at as string | null } : emptyPlayer;
  writeJson(KEYS.player, player);
  return player;
}
