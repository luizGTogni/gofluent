// Reads achievements and the metrics behind their progress. The cache keeps them readable
// synchronously; unlocking happens on the server (trackAchievements in ledger.ts).
import { getSupabase } from "./supabase";
import { KEYS, readJson, writeJson } from "./localCache";

export type AchievementState = { unlocked: Map<string, string>; metrics: Record<string, number> };

/** Unlocked ids and the last known metrics, from the cache. */
export function cachedAchievements(): AchievementState {
  return {
    unlocked: new Map(readJson<string[]>(KEYS.achievements, []).map((id) => [id, ""])),
    metrics: readJson<Record<string, number>>(KEYS.achievementMetrics, {}),
  };
}

export async function loadAchievements(): Promise<AchievementState> {
  const db = await getSupabase();
  if (!db) return cachedAchievements();
  const { data, error } = await db.rpc("achievement_state");
  if (error || !data) return cachedAchievements();
  const state = data as { metrics: Record<string, number>; unlocked: Record<string, string> };
  writeJson(KEYS.achievements, Object.keys(state.unlocked));
  writeJson(KEYS.achievementMetrics, state.metrics);
  return { unlocked: new Map(Object.entries(state.unlocked)), metrics: state.metrics };
}
