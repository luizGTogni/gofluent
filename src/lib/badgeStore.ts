// Reads badges and the lifetime no-hint counter. The cache keeps them readable synchronously;
// unlocking goes through the ledger (grantReward with badge:<id>).
import type { BadgeId } from "./badges";
import { getSupabase } from "./supabase";
import { KEYS, readJson, writeJson } from "./localCache";

/** Badges unlocked so far, from the cache loadBadges and the ledger keep fresh. */
export const unlockedBadges = (): Set<BadgeId> => new Set(readJson<BadgeId[]>(KEYS.badges, []));

/** Lifetime count of phrases finished without a hint — the counter "No Hints, 100 Phrases" watches. */
export const noHintCount = (): number => Number(readJson(KEYS.noHint, 0)) || 0;

export async function loadBadges(): Promise<Set<BadgeId>> {
  const db = await getSupabase();
  if (!db) return unlockedBadges();
  const [badges, inv] = await Promise.all([db.from("badges").select("badge_id"), db.from("inventory").select("no_hint_count").maybeSingle()]);
  if (badges.error) return unlockedBadges();
  const remote = new Set((badges.data ?? []).map((b) => b.badge_id as BadgeId));
  writeJson(KEYS.badges, [...remote]);
  if (!inv.error) writeJson(KEYS.noHint, Number(inv.data?.no_hint_count ?? 0));
  return remote;
}
