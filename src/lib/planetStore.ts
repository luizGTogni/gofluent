import type { PlanetStat } from "./planetStats";
import { COURSE_MOVES_0015, isPlanetId, type PlanetId } from "./planets";
import { getSupabase } from "./supabase";
import { KEYS } from "./localCache";

const readLocal = (): PlanetStat[] => {
  try {
    return (JSON.parse(localStorage.getItem(KEYS.planets) ?? "[]") as PlanetStat[]).filter((s) => isPlanetId(s.planet));
  } catch {
    return [];
  }
};

const writeLocal = (stats: PlanetStat[]) => {
  try {
    localStorage.setItem(KEYS.planets, JSON.stringify(stats));
  } catch {
    /* storage unavailable */
  }
};

const MOVED = "gofluent:planets:moved-0015";

/** Once per device: this cache's stats follow their courses to the planets migration 0015 moved them to. */
function moveLocalOnce(): void {
  try {
    if (localStorage.getItem(MOVED) === "1") return;
    writeLocal(readLocal().map((s) => ({ ...s, planet: COURSE_MOVES_0015[s.planet] ?? s.planet })));
    localStorage.setItem(MOVED, "1");
  } catch {
    /* storage unavailable */
  }
}

type Row = { planet: string; played: number; solid: number; entered_at: string | null };

export async function loadPlanetStats(): Promise<PlanetStat[]> {
  moveLocalOnce();
  const db = await getSupabase();
  if (!db) return readLocal();
  const { data, error } = await db.from("planet_stats").select("planet, played, solid, entered_at");
  if (error || !data) return readLocal();
  const stats = (data as Row[]).filter((r) => isPlanetId(r.planet)).map((r) => ({ planet: r.planet as PlanetId, played: r.played, solid: r.solid, enteredAt: r.entered_at }));
  writeLocal(stats);
  return stats;
}
