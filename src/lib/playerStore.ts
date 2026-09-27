import { emptyPlayer, type PlayerState } from "./xp";
import { getSupabase } from "./supabase";

const KEY = "gofluent:player";

const readLocal = (): PlayerState => {
  try {
    return { ...emptyPlayer, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<PlayerState>) };
  } catch {
    return emptyPlayer;
  }
};

const writeLocal = (p: PlayerState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
};

export async function loadPlayer(): Promise<PlayerState> {
  const db = await getSupabase();
  if (!db) return readLocal();
  const { data, error } = await db.from("player_stats").select("xp, rp, last_active_at").maybeSingle();
  if (error) return readLocal();
  const player = data ? { xp: Number(data.xp), rp: Number(data.rp), lastActiveAt: data.last_active_at as string | null } : emptyPlayer;
  writeLocal(player);
  return player;
}

export async function savePlayer(p: PlayerState): Promise<void> {
  writeLocal(p);
  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db
    .from("player_stats")
    .upsert({ user_id: data.user.id, xp: p.xp, rp: p.rp, last_active_at: p.lastActiveAt, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) console.error("savePlayer failed:", error.message);
}
