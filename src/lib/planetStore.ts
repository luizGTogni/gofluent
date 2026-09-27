import type { PlanetStat } from "./planetStats";
import { isPlanetId, type PlanetId } from "./planets";
import { getSupabase } from "./supabase";

const KEY = "gofluent:planets";

const readLocal = (): PlanetStat[] => {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as PlanetStat[]).filter((s) => isPlanetId(s.planet));
  } catch {
    return [];
  }
};

const writeLocal = (stats: PlanetStat[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* storage unavailable */
  }
};

type Row = { planet: string; played: number; solid: number; entered_at: string | null };

export async function loadPlanetStats(): Promise<PlanetStat[]> {
  const db = await getSupabase();
  if (!db) return readLocal();
  const { data, error } = await db.from("planet_stats").select("planet, played, solid, entered_at");
  if (error || !data) return readLocal();
  const stats = (data as Row[]).filter((r) => isPlanetId(r.planet)).map((r) => ({ planet: r.planet as PlanetId, played: r.played, solid: r.solid, enteredAt: r.entered_at }));
  writeLocal(stats);
  return stats;
}

export async function putPlanetStat(stat: PlanetStat): Promise<void> {
  writeLocal([...readLocal().filter((s) => s.planet !== stat.planet), stat]);
  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db
    .from("planet_stats")
    .upsert({ user_id: data.user.id, planet: stat.planet, played: stat.played, solid: stat.solid, entered_at: stat.enteredAt, updated_at: new Date().toISOString() }, { onConflict: "user_id,planet" });
  if (error) console.error("putPlanetStat failed:", error.message);
}
