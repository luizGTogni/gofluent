// Reads the study calendar and the wallet. Every write goes through the ledger (ledger.ts).
import { getSupabase } from "./supabase";
import { emptyWallet, type Wallet } from "./economy";
import type { DayVolume } from "./heatmap";
import { KEYS, readJson, writeJson } from "./localCache";

export type StudyCalendar = {
  checked: Set<string>;
  frozen: Set<string>;
  /** Phrases and XP per studied day; days from before this was tracked are missing. */
  volume: Map<string, DayVolume>;
};

export const emptyCalendar = (): StudyCalendar => ({ checked: new Set(), frozen: new Set(), volume: new Map() });

const cachedCalendar = (): StudyCalendar => ({
  checked: new Set(readJson<string[]>(KEYS.studyDays, [])),
  frozen: new Set(readJson<string[]>(KEYS.frozenDays, [])),
  volume: new Map(Object.entries(readJson<Record<string, DayVolume>>(KEYS.dayVolume, {}))),
});

export async function loadCalendar(): Promise<StudyCalendar> {
  const db = await getSupabase();
  if (!db) return cachedCalendar();
  const [days, frozen] = await Promise.all([db.from("study_days").select("day, seconds, phrases, xp"), db.from("freeze_days").select("day")]);
  if (days.error || frozen.error) return cachedCalendar();
  const studied = (days.data ?? []).filter((d) => d.seconds > 0);
  const checked = new Set(studied.map((d) => d.day as string));
  const volume = new Map(studied.map((d) => [d.day as string, { phrases: Number(d.phrases ?? 0), xp: Number(d.xp ?? 0) }]));
  const frozenSet = new Set((frozen.data ?? []).map((d) => d.day as string));
  writeJson(KEYS.studyDays, [...checked]);
  writeJson(KEYS.frozenDays, [...frozenSet]);
  writeJson(KEYS.dayVolume, Object.fromEntries(volume));
  return { checked, frozen: frozenSet, volume };
}

export async function loadWallet(): Promise<Wallet> {
  const db = await getSupabase();
  if (!db) return readJson(KEYS.wallet, emptyWallet);
  const { data, error } = await db.from("wallet").select("coins, crystals, freezes").maybeSingle();
  if (error) return readJson(KEYS.wallet, emptyWallet);
  const wallet = data ? { coins: Number(data.coins), crystals: Number(data.crystals), freezes: Number(data.freezes) } : emptyWallet;
  writeJson(KEYS.wallet, wallet);
  return wallet;
}
