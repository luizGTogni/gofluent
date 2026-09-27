// Badges and the lifetime no-hint counter, synced like the wallet: localStorage caches the latest
// values (so reads stay synchronous), Supabase holds the truth.
import type { BadgeId } from "./badges";
import { getSupabase } from "./supabase";

const BADGES_KEY = "gofluent:badges";
const NO_HINT_KEY = "gofluent:noHintCount";
const IMPORTED = "gofluent:badges:imported";

const readBadges = (): Set<BadgeId> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(BADGES_KEY) ?? "[]") as BadgeId[]);
  } catch {
    return new Set();
  }
};
const readNoHint = (): number => {
  try {
    return Number(localStorage.getItem(NO_HINT_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};

/** Pulls badges and the no-hint counter; on the first signed-in load, uploads this device's once. */
export async function loadBadges(): Promise<Set<BadgeId>> {
  const db = await getSupabase();
  if (!db) return readBadges();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return readBadges();
  const uid = auth.user.id;

  const [badges, inv] = await Promise.all([db.from("badges").select("badge_id"), db.from("inventory").select("no_hint_count").maybeSingle()]);
  let remote = new Set((badges.data ?? []).map((b) => b.badge_id as BadgeId));
  let noHint = Number(inv.data?.no_hint_count ?? 0);

  if (localStorage.getItem(IMPORTED) !== "1" && !badges.error && !inv.error) {
    const local = readBadges();
    const missing = [...local].filter((b) => !remote.has(b));
    if (missing.length) await db.from("badges").upsert(missing.map((badge_id) => ({ user_id: uid, badge_id })), { ignoreDuplicates: true });
    remote = new Set([...remote, ...local]);
    const localNoHint = readNoHint();
    if (localNoHint > noHint) {
      noHint = localNoHint;
      await db.from("inventory").upsert({ user_id: uid, no_hint_count: noHint }, { onConflict: "user_id" });
    }
    write(IMPORTED, "1");
  }
  if (badges.error) return readBadges();

  write(BADGES_KEY, JSON.stringify([...remote]));
  write(NO_HINT_KEY, String(noHint));
  return remote;
}

/** Badges unlocked so far, from the cache loadBadges keeps fresh. */
export const unlockedBadges = (): Set<BadgeId> => readBadges();

export async function unlockBadge(id: BadgeId): Promise<void> {
  const set = readBadges();
  if (set.has(id)) return;
  set.add(id);
  write(BADGES_KEY, JSON.stringify([...set]));
  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db.from("badges").upsert({ user_id: data.user.id, badge_id: id }, { ignoreDuplicates: true });
  if (error) console.error("unlockBadge failed:", error.message);
}

/** Lifetime count of phrases finished without a hint — the counter "No Hints, 100 Phrases" watches. */
export function bumpNoHintCount(): number {
  const n = readNoHint() + 1;
  write(NO_HINT_KEY, String(n));
  void (async () => {
    const db = await getSupabase();
    if (!db) return;
    const { data } = await db.auth.getUser();
    if (!data.user) return;
    const { error } = await db.from("inventory").upsert({ user_id: data.user.id, no_hint_count: n }, { onConflict: "user_id" });
    if (error) console.error("bumpNoHintCount failed:", error.message);
  })();
  return n;
}
