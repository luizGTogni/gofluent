// Quest progress, synced like the wallet: localStorage is a cache of the latest rows, Supabase the
// source of truth. Rewards are idempotent per (user, quest, periodKey): see claimQuest.
import { getSupabase } from "./supabase";

export type QuestProgress = { id: string; periodKey: string; count: number; claimed: boolean };

const KEY = "gofluent:quests";
const IMPORTED = "gofluent:quests:imported";

const readAll = (): QuestProgress[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QuestProgress[];
  } catch {
    return [];
  }
};

const writeAll = (rows: QuestProgress[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* storage unavailable */
  }
};

const same = (a: QuestProgress, id: string, periodKey: string) => a.id === id && a.periodKey === periodKey;

/** Pure: the row for this quest and period, or an empty one. */
export const progressFor = (rows: readonly QuestProgress[], id: string, periodKey: string): QuestProgress =>
  rows.find((r) => same(r, id, periodKey)) ?? { id, periodKey, count: 0, claimed: false };

/** Pure: `rows` with `row` replacing the one for its quest and period. */
export const withRow = (rows: readonly QuestProgress[], row: QuestProgress): QuestProgress[] => [
  ...rows.filter((r) => !same(r, row.id, row.periodKey)),
  row,
];

const toRow = (d: { quest_id: string; period_key: string; count: number; claimed: boolean }): QuestProgress => ({
  id: d.quest_id,
  periodKey: d.period_key,
  count: d.count,
  claimed: d.claimed,
});

/** All progress rows. On the first signed-in load, rows kept on this device are uploaded once. */
export async function loadQuests(): Promise<QuestProgress[]> {
  const db = await getSupabase();
  if (!db) return readAll();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return readAll();

  if (localStorage.getItem(IMPORTED) !== "1") {
    const legacy = readAll();
    if (legacy.length) {
      const { error } = await db.from("quest_progress").upsert(
        legacy.map((r) => ({ user_id: auth.user.id, quest_id: r.id, period_key: r.periodKey, count: r.count, claimed: r.claimed })),
        { onConflict: "user_id,quest_id,period_key", ignoreDuplicates: true },
      );
      if (error) console.error("quest import failed:", error.message);
    }
    localStorage.setItem(IMPORTED, "1");
  }

  const { data, error } = await db.from("quest_progress").select("quest_id, period_key, count, claimed");
  if (error) return readAll();
  const rows = (data ?? []).map(toRow);
  writeAll(rows);
  return rows;
}

/** Saves counts (never the claimed flag, which only claimQuest may set). */
export async function putQuests(rows: QuestProgress[]): Promise<void> {
  if (!rows.length) return;
  writeAll(rows.reduce(withRow, readAll()));
  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db
    .from("quest_progress")
    .upsert(
      rows.map((r) => ({ user_id: data.user.id, quest_id: r.id, period_key: r.periodKey, count: r.count })),
      { onConflict: "user_id,quest_id,period_key" },
    );
  if (error) console.error("putQuests failed:", error.message);
}

/**
 * Marks a quest claimed and says whether *this* call claimed it. Only the update that flips
 * claimed from false to true returns a row, so the reward is paid at most once per
 * (user, quest, periodKey), even across devices or repeated calls.
 */
export async function claimQuest(id: string, periodKey: string): Promise<boolean> {
  const db = await getSupabase();
  const local = readAll();
  if (!db) {
    const row = progressFor(local, id, periodKey);
    if (row.claimed) return false;
    writeAll(withRow(local, { ...row, claimed: true }));
    return true;
  }
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return false;
  const { data, error } = await db
    .from("quest_progress")
    .update({ claimed: true })
    .eq("user_id", auth.user.id)
    .eq("quest_id", id)
    .eq("period_key", periodKey)
    .eq("claimed", false)
    .select("quest_id");
  if (error) {
    console.error("claimQuest failed:", error.message);
    return false;
  }
  writeAll(withRow(local, { ...progressFor(local, id, periodKey), claimed: true }));
  return (data ?? []).length > 0;
}
