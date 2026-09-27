// Every write to progress and the economy, sent as an intent the server applies atomically (see
// migrations 0018/0019). Intents carry an idempotency key — a random event id per attempt, or a
// deterministic grant key for once-ever rewards — so repeating one is always safe: a retry, a
// double click, StrictMode, another tab, or the outbox replaying it after a network failure.
//
// The server's answer is the truth: it's written to the device cache (localCache) and returned for
// the UI to reconcile with. Without Supabase, the same intents run against the cache, with the keys
// already applied kept on the device, so the app behaves the same.
import { getSupabase } from "./supabase";
import { KEYS, readJson, writeJson } from "./localCache";
import { coinsForXp, CRYSTALS_PER_CEFR_UP, CRYSTALS_PER_RANK_UP, dailyInterest, emptyWallet, milestoneReward, type Wallet } from "./economy";
import type { Amounts } from "./rewards";
import { cachedPlayer } from "./playerStore";
import type { PlayerState } from "./xp";
import type { PlanetStat } from "./planetStats";
import type { PlanetId } from "./planets";
import { daysStudiedInWeek, QUEST_BY_ID, type QuestDef } from "./quests";
import { progressFor, withRow, type QuestOp, type QuestProgress } from "./questStore";
import { addDays, computeStreak, gapToFreeze } from "./streak";
import { FREEZE_COST, OXYGEN_COST } from "./shop";
import type { DayVolume } from "./heatmap";

export const newEventId = () => crypto.randomUUID();

// ---- intents and what the server answers ----

export type PhraseIntent = {
  eventId: string;
  /** Null for phrases played off the journey (Free mode by level): no planet's progress moves. */
  planet: PlanetId | null;
  words: number;
  xp: number;
  /** Rank points after minus before, from the faded value (effectiveRp); may be negative. */
  rpDelta: number;
  solid: boolean;
  noHint: boolean;
  seconds: number;
  quests: QuestOp[];
  /** The learner's local day (localDay). */
  day: string;
};

/** `replayed`: the key had been applied already and this is the saved, possibly stale, answer. */
type Replayable = { replayed?: boolean };

export type PhraseResult = Replayable & {
  player: PlayerState;
  coins: number;
  wallet: Wallet;
  planet: PlanetStat | null;
  day: { day: string; seconds: number; phrases: number; xp: number };
  noHintCount: number;
  quests: QuestProgress[];
};
export type QuestsResult = Replayable & { quests: QuestProgress[] };
export type GrantResult = { granted: boolean; reason?: "already_granted" | "not_earned"; reward?: Amounts; wallet: Wallet };
export type ClaimResult = { claimed: boolean; reward?: Amounts; wallet: Wallet };
export type ShopItem = "oxygen" | "freeze";
export type PurchaseResult = Replayable & {
  ok: boolean;
  reason?: "insufficient_funds" | "unknown_item" | "already_owned";
  wallet: Wallet;
  inventory: { oxygen: number; cosmetics: string[] };
};
export type DailyResult = { frozenDay: string | null; interest: number; streak: number; wallet: Wallet };
export type OxygenResult = Replayable & { used: boolean; oxygen: number };

/** The server refused the intent (or it can't be queued and the network is down). */
export class LedgerError extends Error {}

// ---- the device cache, written only from answers ----

const cacheWallet = (w: Wallet) => writeJson(KEYS.wallet, { coins: Number(w.coins), crystals: Number(w.crystals), freezes: Number(w.freezes) });
const cachedWallet = (): Wallet => readJson(KEYS.wallet, emptyWallet);
const cachedPlanets = () => readJson<PlanetStat[]>(KEYS.planets, []);
const cachePlanet = (s: PlanetStat) => writeJson(KEYS.planets, [...cachedPlanets().filter((p) => p.planet !== s.planet), s]);
const cachedQuests = () => readJson<QuestProgress[]>(KEYS.quests, []);
const cacheQuests = (rows: QuestProgress[]) => writeJson(KEYS.quests, rows.reduce(withRow, cachedQuests()));
const cachedDays = () => new Set(readJson<string[]>(KEYS.studyDays, []));
const cachedFrozen = () => new Set(readJson<string[]>(KEYS.frozenDays, []));

type Rpc = "complete_phrase" | "advance_quests" | "grant_reward" | "claim_quest" | "purchase" | "apply_daily" | "use_oxygen" | "enter_planet";
type Args = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any */
const ABSORB: Record<Rpc, (r: any, args: Args) => void> = {
  complete_phrase: (r: PhraseResult) => {
    writeJson(KEYS.player, r.player);
    if (r.planet) cachePlanet(r.planet);
    writeJson(KEYS.studyDays, [...cachedDays().add(r.day.day)]);
    writeJson(KEYS.dayVolume, { ...readJson<Record<string, DayVolume>>(KEYS.dayVolume, {}), [r.day.day]: { phrases: r.day.phrases, xp: r.day.xp } });
    cacheWallet(r.wallet);
    writeJson(KEYS.noHint, r.noHintCount);
    cacheQuests(r.quests);
  },
  advance_quests: (r: QuestsResult) => cacheQuests(r.quests),
  grant_reward: (r: GrantResult, args) => {
    cacheWallet(r.wallet);
    const badge = /^badge:(.+)$/.exec(String(args.p_grant_key))?.[1];
    if (r.granted && badge) writeJson(KEYS.badges, [...new Set([...readJson<string[]>(KEYS.badges, []), badge])]);
  },
  claim_quest: (r: ClaimResult, args) => {
    cacheWallet(r.wallet);
    const [id, periodKey] = [String(args.p_quest_id), String(args.p_period_key)];
    if (r.claimed) cacheQuests([{ ...progressFor(cachedQuests(), id, periodKey), claimed: true }]);
  },
  purchase: (r: PurchaseResult) => {
    cacheWallet(r.wallet);
    writeJson(KEYS.oxygen, r.inventory.oxygen);
  },
  apply_daily: (r: DailyResult) => {
    cacheWallet(r.wallet);
    if (r.frozenDay) writeJson(KEYS.frozenDays, [...cachedFrozen().add(r.frozenDay)]);
  },
  use_oxygen: (r: OxygenResult) => writeJson(KEYS.oxygen, r.oxygen),
  enter_planet: (r: PlanetStat) => cachePlanet(r),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- the outbox: intents that hit a network failure, replayed in order with backoff ----

const OUTBOX = "gofluent:outbox";
/** Intents that can wait: progress already shown optimistically. Purchases and claims can't. */
const QUEUEABLE = new Set<Rpc>(["complete_phrase", "advance_quests", "grant_reward", "use_oxygen", "enter_planet"]);
type Queued = { rpc: Rpc; args: Args; tries: number };

const outbox = () => readJson<Queued[]>(OUTBOX, []);
const enqueue = (rpc: Rpc, args: Args) => {
  writeJson(OUTBOX, [...outbox(), { rpc, args, tries: 0 }]);
  scheduleFlush(0);
};

let inFlight = 0;
let flushing = false;
let retry: ReturnType<typeof setTimeout> | undefined;
const synced = new Set<() => void>();

/** No intent in flight or waiting: the device holds all it will hear from the server for now. */
export const ledgerIdle = () => inFlight === 0 && outbox().length === 0;

/** Called after the outbox delivers something, so the UI can reload the server's state. */
export function onOutboxDelivered(fn: () => void): () => void {
  synced.add(fn);
  return () => synced.delete(fn);
}

function scheduleFlush(tries: number) {
  clearTimeout(retry);
  retry = setTimeout(() => void flushOutbox(), tries ? Math.min(300_000, 2000 * 2 ** tries) : 0);
}

const isNetworkError = (status: number) => status === 0;

// ---- other tabs: each one hears when this one changed the state, and reloads it ----

const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("gofluent");
const announce = () => channel?.postMessage("changed");

/** Called when another tab of this app changed progress or the economy. */
export function onOtherTabChanged(fn: () => void): () => void {
  const listener = (e: MessageEvent) => {
    if (e.data === "changed") fn();
  };
  channel?.addEventListener("message", listener);
  return () => channel?.removeEventListener("message", listener);
}

/** Replays the outbox in order. Every intent is idempotent, so replaying one twice is harmless. */
export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  const db = await getSupabase();
  if (!db) return;
  flushing = true;
  let delivered = 0;
  try {
    for (let q = outbox(); q.length; q = outbox()) {
      const item = q[0];
      const { data, error, status } = await db.rpc(item.rpc, item.args);
      if (error && isNetworkError(status)) {
        writeJson(OUTBOX, [{ ...item, tries: item.tries + 1 }, ...q.slice(1)]);
        scheduleFlush(item.tries + 1);
        break;
      }
      if (error) console.error(`outbox: ${item.rpc} refused, dropped:`, error.message);
      else if (!(data as Replayable)?.replayed) ABSORB[item.rpc](data, item.args);
      writeJson(OUTBOX, outbox().slice(1));
      delivered++;
    }
  } finally {
    flushing = false;
  }
  if (delivered) {
    synced.forEach((fn) => fn());
    announce();
  }
}

if (typeof window !== "undefined") window.addEventListener("online", () => void flushOutbox());

// ---- running an intent: on the server when signed in, on the device otherwise ----

const LOCAL_EVENTS = "gofluent:ledger:events";
const LOCAL_GRANTS = "gofluent:ledger:grants";
const localGrants = () => new Set(readJson<string[]>(LOCAL_GRANTS, []));
/** Records a once-ever key on the device; false if it was there already. */
const takeLocalGrant = (key: string) => {
  const grants = localGrants();
  if (grants.has(key)) return false;
  writeJson(LOCAL_GRANTS, [...grants.add(key)]);
  return true;
};

/**
 * Runs `rpc`. Returns the answer, or null when it was queued for later (offline). Throws
 * LedgerError when refused. `local` is the device-only version, keyed by `eventId` if given.
 */
async function run<T>(rpc: Rpc, args: Args, local: () => T, eventId?: string): Promise<T | null> {
  const db = await getSupabase();
  if (!db) {
    const events = readJson<Record<string, T>>(LOCAL_EVENTS, {});
    if (eventId && events[eventId]) return { ...events[eventId], replayed: true };
    const r = local();
    ABSORB[rpc](r, args);
    announce();
    // The last couple hundred answers are plenty to recognise a repeat.
    if (eventId) writeJson(LOCAL_EVENTS, Object.fromEntries([...Object.entries(events), [eventId, r]].slice(-200)));
    return r;
  }
  // Keep order: nothing overtakes an intent already waiting (a rank-up must follow its phrase).
  if (QUEUEABLE.has(rpc) && outbox().length) {
    enqueue(rpc, args);
    return null;
  }
  inFlight++;
  try {
    const { data, error, status } = await db.rpc(rpc, args);
    if (error && isNetworkError(status)) {
      if (!QUEUEABLE.has(rpc)) throw new LedgerError("You're offline. Try again when you're back online.");
      enqueue(rpc, args);
      return null;
    }
    if (error) throw new LedgerError(error.message);
    if (!(data as Replayable)?.replayed) {
      ABSORB[rpc](data, args);
      announce();
    }
    return data as T;
  } finally {
    inFlight--;
  }
}

// ---- the intents ----

const mondayOf = (day: string) => {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, dow === 0 ? -6 : 1 - dow);
};
const periodOf = (def: QuestDef, day: string) => (def.period === "daily" ? day : mondayOf(day));

/** Device version of the server's quest ticking, "Five-day week" recounted from study days. */
function tickLocal(ops: QuestOp[], day: string, studied: ReadonlySet<string>): QuestProgress[] {
  let rows = cachedQuests();
  const touched: QuestProgress[] = [];
  const put = (row: QuestProgress) => {
    rows = withRow(rows, row);
    touched.push(row);
  };
  for (const op of ops) {
    const def = QUEST_BY_ID.get(op.id);
    if (!def || def.id === "w_five_days") continue;
    const n = Math.min(def.target, Math.max(0, op.n));
    if (!n) continue;
    const row = progressFor(rows, def.id, periodOf(def, day));
    put({ ...row, count: Math.min(def.target, op.op === "max" ? Math.max(row.count, n) : row.count + n) });
  }
  const week = QUEST_BY_ID.get("w_five_days")!;
  const days = Math.min(week.target, daysStudiedInWeek(studied, mondayOf(day)));
  if (days) {
    const row = progressFor(rows, week.id, mondayOf(day));
    put({ ...row, count: Math.max(row.count, days) });
  }
  return touched;
}

export function completePhrase(i: PhraseIntent): Promise<PhraseResult | null> {
  const args = {
    p_event_id: i.eventId, p_planet: i.planet, p_words: i.words, p_xp: i.xp, p_rp_delta: i.rpDelta, p_solid: i.solid,
    p_no_hint: i.noHint, p_seconds: i.seconds, p_quests: i.quests, p_local_day: i.day,
  };
  return run<PhraseResult>("complete_phrase", args, () => {
    const p = cachedPlayer();
    const xp = p.xp + i.xp;
    const planet = i.planet;
    const prev = planet && cachedPlanets().find((s) => s.planet === planet);
    const vol = readJson<Record<string, DayVolume>>(KEYS.dayVolume, {})[i.day] ?? { phrases: 0, xp: 0 };
    const coins = coinsForXp(i.xp);
    const w = cachedWallet();
    return {
      player: { xp, rp: Math.max(0, Math.min(xp, p.rp + i.rpDelta)), lastActiveAt: new Date().toISOString() },
      coins,
      wallet: { ...w, coins: w.coins + coins },
      planet: planet && {
        planet,
        played: (prev ? prev.played : 0) + 1,
        solid: (prev ? prev.solid : 0) + (i.solid ? 1 : 0),
        enteredAt: (prev && prev.enteredAt) ?? new Date().toISOString(),
      },
      day: { day: i.day, seconds: i.seconds, phrases: vol.phrases + 1, xp: vol.xp + i.xp },
      noHintCount: readJson(KEYS.noHint, 0) + (i.noHint ? 1 : 0),
      quests: tickLocal(i.quests, i.day, cachedDays().add(i.day)),
    };
  }, i.eventId);
}

export const advanceQuests = (eventId: string, ops: QuestOp[], day: string) =>
  run<QuestsResult>("advance_quests", { p_event_id: eventId, p_quests: ops, p_local_day: day }, () => ({ quests: tickLocal(ops, day, cachedDays()) }), eventId);

/** Once-ever rewards: milestone:<days>:<streak start>, rank:<index>, cefr:<level>, badge:<id>. */
export const grantReward = (key: string) =>
  run<GrantResult>("grant_reward", { p_grant_key: key }, () => {
    const milestone = /^milestone:(\d+):/.exec(key);
    const reward: Amounts = milestone
      ? milestoneReward(Number(milestone[1]))
      : key.startsWith("rank:")
        ? { crystals: CRYSTALS_PER_RANK_UP }
        : key.startsWith("cefr:")
          ? { crystals: CRYSTALS_PER_CEFR_UP }
          : {};
    const w = cachedWallet();
    if (!takeLocalGrant(key)) return { granted: false, reason: "already_granted", wallet: w };
    const wallet = { coins: w.coins + (reward.coins ?? 0), crystals: w.crystals + (reward.crystals ?? 0), freezes: w.freezes + (reward.freezes ?? 0) };
    return { granted: true, reward, wallet };
  });

export const claimQuest = (id: string, periodKey: string) =>
  run<ClaimResult>("claim_quest", { p_quest_id: id, p_period_key: periodKey }, () => {
    const def = QUEST_BY_ID.get(id);
    const row = progressFor(cachedQuests(), id, periodKey);
    const w = cachedWallet();
    if (!def || row.claimed || row.count < def.target) return { claimed: false, wallet: w };
    const reward = { coins: def.coins, crystals: def.crystals ?? 0 };
    return { claimed: true, reward, wallet: { ...w, coins: w.coins + reward.coins, crystals: w.crystals + reward.crystals } };
  });

const PRICE: Record<ShopItem, number> = { oxygen: OXYGEN_COST, freeze: FREEZE_COST };

export const purchase = (eventId: string, item: ShopItem) =>
  run<PurchaseResult>("purchase", { p_event_id: eventId, p_item_kind: item, p_item_id: item }, () => {
    const w = cachedWallet();
    const oxygen = readJson(KEYS.oxygen, 0);
    if (w.coins < PRICE[item]) return { ok: false, reason: "insufficient_funds", wallet: w, inventory: { oxygen, cosmetics: [] } };
    return {
      ok: true,
      wallet: { ...w, coins: w.coins - PRICE[item], freezes: w.freezes + (item === "freeze" ? 1 : 0) },
      inventory: { oxygen: oxygen + (item === "oxygen" ? 1 : 0), cosmetics: [] },
    };
  }, eventId);

/** On opening the app: a Streak Shield for a single missed day, then the day's study interest. */
export const applyDaily = (day: string) =>
  run<DailyResult>("apply_daily", { p_local_day: day }, () => {
    const checked = cachedDays();
    const frozen = cachedFrozen();
    let w = cachedWallet();
    let frozenDay: string | null = null;
    const gap = gapToFreeze(checked, day);
    if (gap && w.freezes > 0 && !frozen.has(gap) && takeLocalGrant(`freeze:${gap}`)) {
      w = { ...w, freezes: w.freezes - 1 };
      frozen.add(gap);
      frozenDay = gap;
    }
    const streak = computeStreak(checked, frozen, addDays(day, -1)).current;
    let interest = 0;
    if (streak > 0 && takeLocalGrant(`interest:${day}`)) {
      interest = dailyInterest(streak, w.coins);
      w = { ...w, coins: w.coins + interest };
    }
    return { frozenDay, interest, streak, wallet: w };
  });

export const spendOxygen = (eventId: string) =>
  run<OxygenResult>("use_oxygen", { p_event_id: eventId }, () => {
    const oxygen = readJson(KEYS.oxygen, 0);
    return oxygen > 0 ? { used: true, oxygen: oxygen - 1 } : { used: false, oxygen };
  }, eventId);

/** The first visit to a planet (what its rank requirement gates); later visits change nothing. */
export const enterPlanet = (planet: PlanetId) =>
  run<PlanetStat>("enter_planet", { p_planet: planet }, () => {
    const prev = cachedPlanets().find((s) => s.planet === planet);
    return { planet, played: prev?.played ?? 0, solid: prev?.solid ?? 0, enteredAt: prev?.enteredAt ?? new Date().toISOString() };
  });
