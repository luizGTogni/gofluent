import { localDay } from "./streak";
import { getSupabase } from "./supabase";
import { emptyWallet, type Wallet } from "./economy";

const K_WALLET = "gofluent:wallet";
const K_DAYS = "gofluent:studydays";
const K_FROZEN = "gofluent:frozendays";
const K_INTEREST = "gofluent:lastinterest";

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

export type StudyCalendar = { checked: Set<string>; frozen: Set<string>; lastInterestDay: string | null };

export async function loadCalendar(): Promise<StudyCalendar> {
  const db = await getSupabase();
  if (!db) {
    return { checked: new Set(readJson<string[]>(K_DAYS, [])), frozen: new Set(readJson<string[]>(K_FROZEN, [])), lastInterestDay: readJson(K_INTEREST, null) };
  }
  const [days, frozen] = await Promise.all([db.from("study_days").select("day, seconds"), db.from("freeze_days").select("day")]);
  const checked = new Set((days.data ?? []).filter((d) => d.seconds > 0).map((d) => d.day as string));
  const frozenSet = new Set((frozen.data ?? []).map((d) => d.day as string));
  writeJson(K_DAYS, [...checked]);
  writeJson(K_FROZEN, [...frozenSet]);
  return { checked, frozen: frozenSet, lastInterestDay: null };
}

/** Adds seconds to today's (local) study day, local + remote. */
export async function addStudySeconds(seconds: number): Promise<void> {
  if (seconds <= 0) return;
  const day = localDay(new Date());
  const days = new Set(readJson<string[]>(K_DAYS, []));
  days.add(day);
  writeJson(K_DAYS, [...days]);

  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { data: existing } = await db.from("study_days").select("seconds").eq("day", day).maybeSingle();
  const { error } = await db.from("study_days").upsert({ user_id: data.user.id, day, seconds: (existing?.seconds ?? 0) + seconds }, { onConflict: "user_id,day" });
  if (error) console.error("addStudySeconds failed:", error.message);
}

export async function addFrozenDay(day: string): Promise<void> {
  const frozen = new Set(readJson<string[]>(K_FROZEN, []));
  frozen.add(day);
  writeJson(K_FROZEN, [...frozen]);

  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db.from("freeze_days").upsert({ user_id: data.user.id, day }, { onConflict: "user_id,day" });
  if (error) console.error("addFrozenDay failed:", error.message);
}

export async function loadWallet(): Promise<Wallet> {
  const db = await getSupabase();
  if (!db) return readJson(K_WALLET, emptyWallet);
  const { data, error } = await db.from("wallet").select("coins, crystals, freezes").maybeSingle();
  if (error || !data) return readJson(K_WALLET, emptyWallet);
  const wallet = { coins: Number(data.coins), crystals: Number(data.crystals), freezes: Number(data.freezes) };
  writeJson(K_WALLET, wallet);
  return wallet;
}

export async function saveWallet(w: Wallet): Promise<void> {
  writeJson(K_WALLET, w);
  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db
    .from("wallet")
    .upsert({ user_id: data.user.id, coins: w.coins, crystals: w.crystals, freezes: w.freezes, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) console.error("saveWallet failed:", error.message);
}

/** Once per day: has interest already been credited today? */
export async function interestAppliedToday(): Promise<boolean> {
  const today = localDay(new Date());
  const db = await getSupabase();
  if (!db) return readJson(K_INTEREST, null) === today;
  const { data } = await db.from("wallet").select("last_interest_day").maybeSingle();
  return data?.last_interest_day === today;
}

export async function markInterestApplied(): Promise<void> {
  const today = localDay(new Date());
  writeJson(K_INTEREST, today);
  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  await db.from("wallet").update({ last_interest_day: today }).eq("user_id", data.user.id);
}
