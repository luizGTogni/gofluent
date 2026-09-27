// Quest progress: pure helpers and the loader. Ticking and claiming go through the ledger
// (ledger.ts), which pays a claim at most once per (user, quest, periodKey).
import { periodKeyFor, QUEST_BY_ID, QUESTS, type QuestDef } from "./quests";
import { getSupabase } from "./supabase";
import { KEYS, readJson, writeJson } from "./localCache";

export type QuestProgress = { id: string; periodKey: string; count: number; claimed: boolean };

const readAll = () => readJson<QuestProgress[]>(KEYS.quests, []);

const same = (a: QuestProgress, id: string, periodKey: string) => a.id === id && a.periodKey === periodKey;

/** Pure: the row for this quest and period, or an empty one. */
export const progressFor = (rows: readonly QuestProgress[], id: string, periodKey: string): QuestProgress =>
  rows.find((r) => same(r, id, periodKey)) ?? { id, periodKey, count: 0, claimed: false };

/** Pure: `rows` with `row` replacing the one for its quest and period. */
export const withRow = (rows: readonly QuestProgress[], row: QuestProgress): QuestProgress[] => [
  ...rows.filter((r) => !same(r, row.id, row.periodKey)),
  row,
];

export type QuestTick = { id: string; count: (prev: number) => number };

/** A tick as the ledger sends it: add `n`, or raise the count to at least `n`. */
export type QuestOp = { id: string; op: "add" | "max"; n: number };
export const addOp = (id: string, n: number): QuestOp => ({ id, op: "add", n });
export const maxOp = (id: string, n: number): QuestOp => ({ id, op: "max", n });
export const opTick = ({ id, op, n }: QuestOp): QuestTick => ({ id, count: (prev) => (op === "add" ? prev + n : Math.max(prev, n)) });

/**
 * Pure: applies `ticks` to the current period of each quest. Counts are capped at the target.
 * Returns the new rows, the rows that changed, and the quests that just reached their target —
 * those wait, unclaimed, for the learner to claim them (see claimQuest).
 */
export function tickQuests(rows: readonly QuestProgress[], ticks: QuestTick[], now: Date) {
  let next = [...rows];
  const touched: QuestProgress[] = [];
  const reached: QuestDef[] = [];
  for (const t of ticks) {
    const def = QUEST_BY_ID.get(t.id);
    if (!def) continue;
    const prev = progressFor(next, t.id, periodKeyFor(def, now));
    const row = { ...prev, count: Math.min(def.target, t.count(prev.count)) };
    if (row.count === prev.count) continue;
    next = withRow(next, row);
    touched.push(row);
    if (row.count >= def.target && prev.count < def.target) reached.push(def);
  }
  return { rows: next, touched, reached };
}

/** Pure: reached but not yet claimed — a reward waiting for its button. */
export const claimable = (q: QuestDef, row: QuestProgress) => row.count >= q.target && !row.claimed;

/** Pure: the quests whose count went up between two snapshots, in the current period. */
export function advancedQuests(before: readonly QuestProgress[], after: readonly QuestProgress[], now: Date) {
  return QUESTS.map((q: QuestDef) => {
    const key = periodKeyFor(q, now);
    return { q, before: progressFor(before, q.id, key).count, after: progressFor(after, q.id, key).count };
  }).filter((m) => m.after > m.before);
}

const toRow = (d: { quest_id: string; period_key: string; count: number; claimed: boolean }): QuestProgress => ({
  id: d.quest_id,
  periodKey: d.period_key,
  count: d.count,
  claimed: d.claimed,
});

/** All progress rows. */
export async function loadQuests(): Promise<QuestProgress[]> {
  const db = await getSupabase();
  if (!db) return readAll();
  const { data, error } = await db.from("quest_progress").select("quest_id, period_key, count, claimed");
  if (error) return readAll();
  const rows = (data ?? []).map(toRow);
  writeJson(KEYS.quests, rows);
  return rows;
}
