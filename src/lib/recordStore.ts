// Personal best score per game mode, synced like the wallet: localStorage caches the latest values
// (so the end screen reads them synchronously), Supabase holds the truth. A best only ever rises.
import type { GameMode } from "./modes";
import { getSupabase } from "./supabase";

type Bests = Partial<Record<GameMode, number>>;

const KEY = "gofluent:bests";

const readLocal = (): Bests => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Bests;
  } catch {
    return {};
  }
};
const writeLocal = (b: Bests) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* storage unavailable */
  }
};

/** Pulls the bests, keeping the higher of this device's and the server's for each mode. */
export async function loadBests(): Promise<Bests> {
  const local = readLocal();
  const db = await getSupabase();
  if (!db) return local;
  const { data, error } = await db.from("personal_bests").select("mode, score");
  if (error) return local;
  const merged = { ...local };
  for (const row of data ?? []) {
    const mode = row.mode as GameMode;
    merged[mode] = Math.max(merged[mode] ?? 0, Number(row.score));
  }
  writeLocal(merged);
  return merged;
}

/** The best score for `mode` so far, from the cache loadBests keeps fresh. */
export const bestFor = (mode: GameMode): number => readLocal()[mode] ?? 0;

/** Records `score` for `mode` if it beats the current best. */
export async function putBest(mode: GameMode, score: number): Promise<void> {
  const bests = readLocal();
  if (score <= (bests[mode] ?? 0)) return;
  writeLocal({ ...bests, [mode]: score });
  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db
    .from("personal_bests")
    .upsert({ user_id: data.user.id, mode, score, updated_at: new Date().toISOString() }, { onConflict: "user_id,mode" });
  if (error) console.error("putBest failed:", error.message);
}
