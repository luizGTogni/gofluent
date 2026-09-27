import { getSupabase } from "./supabase";
import type { WordStat } from "./wordStats";

const KEY = "gofluent:words";

const normalize = (s: Partial<WordStat>): WordStat => ({
  word: s.word ?? "",
  seen: s.seen ?? 0,
  struggled: s.struggled ?? 0,
  fails: s.fails ?? 0,
  listening: s.listening ?? 0,
  spelling: s.spelling ?? 0,
});

const readLocal = (): WordStat[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Partial<WordStat>[];
    return raw.map(normalize);
  } catch {
    return [];
  }
};

const writeLocal = (stats: WordStat[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* storage unavailable: stats just won't persist offline */
  }
};

/** Supabase when reachable (mirrored to localStorage); otherwise the local copy. */
export async function loadWordStats(): Promise<WordStat[]> {
  const db = await getSupabase();
  if (!db) return readLocal();
  const { data, error } = await db.from("word_stats").select("word, seen, struggled, fails, listening, spelling");
  if (error || !data) return readLocal();
  const stats = (data as Partial<WordStat>[]).map(normalize);
  writeLocal(stats);
  return stats;
}

export async function putWordStats(changed: WordStat[]): Promise<void> {
  if (!changed.length) return;
  const byWord = new Map(readLocal().map((s) => [s.word, s]));
  for (const s of changed) byWord.set(s.word, s);
  writeLocal([...byWord.values()]);

  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const now = new Date().toISOString();
  const { error } = await db
    .from("word_stats")
    .upsert(changed.map((s) => ({ user_id: data.user!.id, ...s, updated_at: now })), { onConflict: "user_id,word" });
  if (error) console.error("putWordStats failed:", error.message);
}
