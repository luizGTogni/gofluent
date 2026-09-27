"use client";

import { useEffect, useRef, useState } from "react";
import { DIFFICULTIES, DIFFICULTY, scoreExercise, TIER_COPY, TIER_LABEL, type Difficulty, type Result, type Tier } from "@/lib/engine";
import { buildSession, loadContent, type SessionPlan } from "@/lib/content";
import { getAccount } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { afterAttempt, dueList, whenLabel, type ReviewState } from "@/lib/review";
import { loadReview, putReview } from "@/lib/reviewStore";
import { applyOutcome, isTricky, rate, trickyList, type WordStat } from "@/lib/wordStats";
import { loadWordStats, putWordStats } from "@/lib/wordStore";
import { EXERCISES, sentenceOf, type Exercise } from "@/lib/exercises";
import { PLANET_BY_ID, PLANETS, STARTER_PLANETS, type PlanetId } from "@/lib/planets";
import { cefrBands, cefrEstimate, continuePlanet, isSolid, journeyIndex, markEntered, recordResult, type PlanetStat } from "@/lib/planetStats";
import { CELESTIAL_PATH } from "@/lib/bodies";
import { loadPlanetStats } from "@/lib/planetStore";
import { speak, stopSpeech } from "@/lib/speech";
import { loadPlayer } from "@/lib/playerStore";
import { effectiveRp, rankChange, rankOf } from "@/lib/ranks";
import type { Title } from "@/lib/titles";
import { addXp, emptyPlayer, levelFromXp, levelProgress, phraseXp, type PlayerState, type XpBreakdown } from "@/lib/xp";
import { extendedUnlocked, modeUnlocked, type Accent } from "@/lib/unlocks";
import { addDays, computeStreak, localDay, localHour, milestoneHit } from "@/lib/streak";
import { pickDifficulty } from "@/lib/adaptive";
import { levelPool } from "@/lib/levels";
import { MODES, SURVIVAL_LIVES, TIME_ATTACK_SECONDS, type GameMode } from "@/lib/modes";
import { ModePicker } from "./ModePicker";
import { daysStudiedInWeek, weekKey, type QuestDef } from "@/lib/quests";
import { addOp, loadQuests, maxOp, opTick, progressFor, tickQuests, withRow, type QuestOp, type QuestProgress } from "@/lib/questStore";
import { loadBadges, noHintCount, unlockedBadges } from "@/lib/badgeStore";
import { BADGE_BY_ID, type BadgeId } from "@/lib/badges";
import { addGains, badgeReward, emptyGains, questReward, streakReward, type Amounts, type Reward, type RewardDraft, type SessionGains } from "@/lib/rewards";
import { bestFor, loadBests, putBest } from "@/lib/recordStore";
import { QuestBoard } from "./QuestBoard";
import { FREEZE_COST, OXYGEN_COST } from "@/lib/shop";
import { getOxygen, loadInventory } from "@/lib/shopStore";
import { Shop } from "./Shop";
import { Currency } from "./Currency";
import { ArrowRight, Close, Combo, Comeback, Compass, Heart, HeartEmpty, Lock, Oxygen, Play, Shield, Storm, Target, Timer, Volume } from "./icons";
import { Stars } from "./icons/Stars";
import { getProfile, signOut, syncTimeZone } from "@/lib/auth";
import { coinsForXp, CRYSTALS_PER_CEFR_UP, CRYSTALS_PER_RANK_UP, milestoneReward, type Wallet } from "@/lib/economy";
import { emptyCalendar, loadCalendar, loadWallet, type StudyCalendar } from "@/lib/economyStore";
import {
  advanceQuests as sendQuests,
  applyDaily,
  claimQuest,
  completePhrase,
  enterPlanet,
  flushOutbox,
  grantReward,
  LedgerError,
  ledgerIdle,
  newEventId,
  onOtherTabChanged,
  onOutboxDelivered,
  purchase,
  spendOxygen,
  type PhraseResult,
  type ShopItem,
} from "@/lib/ledger";
import { ExerciseView } from "./ExerciseView";
import { AuthGate } from "./AuthGate";
import { MyWords } from "./MyWords";
import { Profile } from "./Profile";
import { ProfileSettings } from "./ProfileSettings";
import { Promotion } from "./Promotion";
import { TopBar } from "./TopBar";
import { Courses } from "./Courses";
import { TrickyWords } from "./TrickyWords";
import { SaveChunks } from "./SaveChunks";
import { Heatmap } from "./Heatmap";
import { WordCards } from "./WordCards";
import { XpMeter } from "./XpMeter";
import { RewardToasts } from "./RewardToasts";
import { SessionEnd } from "./SessionEnd";
import { SessionSide } from "./SessionSide";
import { PlayerCard } from "./PlayerCard";
import { DailyMissions, MissionRail } from "./MissionRail";

type Summary = {
  tier: Tier;
  points: number;
  combo: number;
  result: Result;
  review?: string;
  stumbled: string[];
  xp?: XpBreakdown;
  levelUp?: number;
  /** A new star within the same title. */
  starNote?: { stars: number; title: string };
  coins?: number;
  crystals?: number;
  cefrNote?: string;
  comebackNote?: string;
  oxygenNote?: string;
};
type Auth = "loading" | "gate" | "guest" | "member";
type Screen = "intro" | "modes" | "play" | "end" | "words" | "tricky" | "profile" | "settings" | "quests" | "shop";

const SUMMARY_SETTLE_MS = 300;

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const GUEST_KEY = "gofluent:guest";
const readGuest = () => {
  try {
    return sessionStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
};
const writeGuest = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(GUEST_KEY, "1");
    else sessionStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
};

export function Session() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [exercises, setExercises] = useState<Exercise[]>(EXERCISES);
  const [library, setLibrary] = useState<Exercise[]>(EXERCISES);
  // The planet picked on the journey or in Free mode; the stop you're on when it can't be played.
  const [planetId, setPlanetId] = useState<PlanetId>(PLANETS[0].id);
  const [planetStats, setPlanetStats] = useState<Map<PlanetId, PlanetStat>>(new Map());
  // Free mode by level: the level picked, and the one the current run plays (null on the journey).
  const [freeLevel, setFreeLevel] = useState<Difficulty | null>("easy");
  const [runLevel, setRunLevel] = useState<Difficulty | null>(null);
  const total = exercises.length;
  const [review, setReview] = useState<Map<string, ReviewState>>(new Map());
  const [reviewKeys, setReviewKeys] = useState<Set<string>>(new Set());
  const [practiceKeys, setPracticeKeys] = useState<Set<string>>(new Set());
  const [auth, setAuth] = useState<Auth>("loading");
  // Members get the full experience. Guests only pick a level and play; nothing is saved.
  // Without Supabase there are no accounts, so the app stays in its local, full mode.
  const full = auth === "member";
  const [wordStats, setWordStats] = useState<Map<string, WordStat>>(new Map());
  const [index, setIndex] = useState(0);
  const [replay, setReplay] = useState(0);
  const [audioTick, setAudioTick] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [hidden, setHidden] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [accent, setAccent] = useState<Accent>("us");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<Summary[]>([]);
  const [player, setPlayer] = useState<PlayerState>(emptyPlayer);
  const [promo, setPromo] = useState<Title | null>(null);
  const [wallet, setWallet] = useState<Wallet>({ coins: 0, crystals: 0, freezes: 0 });
  // The latest wallet, readable synchronously, so rewards are computed before any setState.
  const walletRef = useRef(wallet);
  const [quests, setQuests] = useState<QuestProgress[]>([]);
  const [calendar, setCalendar] = useState<StudyCalendar>(emptyCalendar);
  const [freezeNote, setFreezeNote] = useState<string | null>(null);
  // A quiet line when a save was refused or couldn't reach the server.
  const [syncNote, setSyncNote] = useState<string | null>(null);
  // The idempotency key of the phrase on screen: made once per attempt, so resubmitting it (a
  // retry, the outbox) can only ever count it once.
  const [attemptId, setAttemptId] = useState("");
  // Oxygen tanks spent this run that the server hasn't confirmed yet (the cache lags behind them).
  const tanksPending = useRef(0);
  // Interaction locks: the attempt already completed, the attempt already left with Next, and
  // whether this run has ended — so a double Enter or click acts once.
  const submitted = useRef("");
  const advanced = useRef("");
  const finished = useRef(false);
  // When the phrase summary opened. Next ignores the first moments, so the second Enter of a quick
  // double Enter (which lands on the autofocused Next) doesn't skip the summary unseen.
  const summaryAt = useRef(0);
  const [fullName, setFullName] = useState<string | undefined>();
  const [mode, setMode] = useState<GameMode>("classic");
  const [lives, setLives] = useState(SURVIVAL_LIVES);
  const [timeLeft, setTimeLeft] = useState(TIME_ATTACK_SECONDS);
  // What this session earned, and where things stood when it began, for the end screen.
  const [gains, setGains] = useState<SessionGains>(emptyGains);
  const [startedWith, setStartedWith] = useState({ xp: 0, quests: [] as QuestProgress[], checkedIn: false });
  const [prevBest, setPrevBest] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Reward[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuth("member");
      return;
    }
    getAccount().then((a) => setAuth(a ? "member" : readGuest() ? "guest" : "gate"));
  }, []);

  useEffect(() => {
    if (screen !== "play" || summary) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [screen, summary]);

  // Time Attack: the clock keeps running even while a summary card is up — that's the pressure.
  useEffect(() => {
    if (screen !== "play" || mode !== "timeAttack") return;
    if (timeLeft <= 0) {
      finishSession(false);
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [screen, mode, timeLeft]);

  const nowDate = new Date();
  const rpNow = effectiveRp(player, nowDate);
  const rank = rankOf(rpNow);
  const playerLevel = levelFromXp(rpNow);
  const held = rankOf(player.rp);
  const slipped = rank.index < held.index || (rank.index === held.index && rank.stars < held.stars);
  const lvl = levelProgress(player.xp);
  const canExtend = extendedUnlocked(rank.index);
  const streak = computeStreak(calendar.checked, calendar.frozen, localDay(nowDate));
  const courseCounts = Object.fromEntries(PLANETS.map((p) => [p.id, library.filter((e) => e.planet === p.id).length])) as Record<PlanetId, number>;
  // Where "Continue" goes; null while the stop you're on has no phrases yet.
  const continueId = continuePlanet(planetId, planetStats, courseCounts);
  const currentStop = CELESTIAL_PATH[journeyIndex(planetStats, courseCounts)];
  // A mode the rank no longer (or doesn't yet) allow falls back to Classic.
  const playMode: GameMode = modeUnlocked(mode, playerLevel) ? mode : "classic";

  const exercise = exercises[index];

  const celebrate = (r: RewardDraft) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { ...r, id }]);
  };
  const dismissToast = (id: number) => setToasts((t) => t.filter((r) => r.id !== id));

  /** Mission progress shown at once, announcing any mission that just reached its target. The
   * same ticks go to the server with the intent that caused them. */
  const tickLocally = (ops: QuestOp[], now: Date) => {
    const { rows, touched, reached } = tickQuests(quests, ops.map(opTick), now);
    if (!touched.length) return;
    setQuests(rows);
    for (const def of reached) celebrate(questReward(def));
  };

  const showWallet = (w: Wallet) => {
    walletRef.current = w;
    setWallet(w);
  };
  /** An optimistic change to the wallet, shown until the server's answer replaces it. */
  const bumpWallet = (d: Amounts) => {
    const w = walletRef.current;
    showWallet({ coins: w.coins + (d.coins ?? 0), crystals: w.crystals + (d.crystals ?? 0), freezes: w.freezes + (d.freezes ?? 0) });
  };
  /** The server's wallet, unless other intents are still on their way: its answer would then
   * predate them and undo what they already show. The last one to land settles it. */
  const settleWallet = (w: Wallet) => {
    if (ledgerIdle()) showWallet(w);
  };

  /** Back to the server's state: after a refusal, or when the outbox delivers. */
  const resync = () => {
    loadPlayer().then(setPlayer);
    loadWallet().then(showWallet);
    loadQuests().then(setQuests);
    loadPlanetStats().then((list) => setPlanetStats(new Map(list.map((p) => [p.planet, p]))));
    loadCalendar().then(setCalendar);
  };
  const failed = (e: unknown) => {
    console.error(e);
    setSyncNote(e instanceof LedgerError && e.message.startsWith("You're offline") ? e.message : "Couldn't save that. Showing your saved progress.");
    resync();
  };

  /** The server's answer to a phrase, once nothing newer is in flight. */
  const settlePhrase = (r: PhraseResult) => {
    if (r.replayed || !ledgerIdle()) return;
    setPlayer(r.player);
    showWallet(r.wallet);
    const stat = r.planet;
    if (stat) setPlanetStats((m) => new Map(m).set(stat.planet, stat));
    setQuests((rows) => r.quests.reduce(withRow, rows));
    setCalendar((c) => ({ ...c, volume: new Map(c.volume).set(r.day.day, { phrases: r.day.phrases, xp: r.day.xp }) }));
  };

  /**
   * The claim moment: shown as claimed at once; the server flips it and pays in one step, at
   * most once per user, quest and period. Returns whether this claim paid.
   */
  const claim = async (def: QuestDef, periodKey: string): Promise<boolean> => {
    const mark = (claimed: boolean) => setQuests((rows) => withRow(rows, { ...progressFor(rows, def.id, periodKey), claimed }));
    mark(true);
    try {
      const r = await claimQuest(def.id, periodKey);
      if (!r?.claimed) return false;
      if (ledgerIdle()) showWallet(r.wallet);
      else bumpWallet(r.reward ?? {});
      if (screen === "play" || screen === "end") setGains((g) => addGains(g, { coins: def.coins, crystals: def.crystals }));
      return true;
    } catch (e) {
      mark(false);
      failed(e);
      return false;
    }
  };

  /** Buys one item: charged at once, then settled (or undone) by the server's answer. */
  const buy = async (item: ShopItem): Promise<boolean> => {
    const price = item === "oxygen" ? OXYGEN_COST : FREEZE_COST;
    if (walletRef.current.coins < price) return false;
    bumpWallet({ coins: -price, freezes: item === "freeze" ? 1 : 0 });
    try {
      const r = await purchase(newEventId(), item);
      if (r?.ok) {
        settleWallet(r.wallet);
        return true;
      }
      setSyncNote(r?.reason === "insufficient_funds" ? "Not enough Lunar Coins for that." : "That item isn't available.");
      resync();
    } catch (e) {
      failed(e);
    }
    return false;
  };

  const complete = (result: Result) => {
    if (submitted.current === attemptId) return;
    submitted.current = attemptId;
    const nextCombo = result.typedErrors === 0 ? combo + 1 : 0;
    const { tier, points } = scoreExercise(exercise.words, result, nextCombo, difficulty);
    const s: Summary = { tier, points, combo: nextCombo, result, stumbled: result.perWord.filter((w) => w.fails > 0).map((w) => w.word) };
    if (full) {
      const now = new Date();

      // A comeback: this phrase had tripped the learner up before (it's in review with a lapse),
      // and this run nailed it clean. Learning from a mistake is worth more than never missing it.
      const key = sentenceOf(exercise);
      const prevReview = review.get(key);
      const success = result.typedErrors === 0 && !result.helped;
      const cameBack = Boolean(prevReview && prevReview.lapses > 0 && success);

      // XP: lifetime XP only grows; rank points fade with inactivity, so earn from the faded value.
      const gain = phraseXp(exercise.words, result, difficulty, cameBack);
      if (cameBack) s.comebackNote = "Comeback! You finally nailed a phrase that used to trip you up.";
      const rpNow = effectiveRp(player, now);
      const before = rankOf(rpNow);
      const after = addXp({ ...player, rp: rpNow }, gain.total, now);
      setPlayer(after);
      s.xp = gain;
      const levelBefore = levelFromXp(player.xp);
      const levelAfter = levelFromXp(after.xp);
      if (levelAfter > levelBefore) s.levelUp = levelAfter;
      const rankAfter = rankOf(after.rp);
      const change = rankChange(before, rankAfter);
      if (change === "star") s.starNote = { stars: rankAfter.stars, title: rankAfter.title.name };
      if (change === "promotion") setPromo(rankAfter.title);

      const cefrBefore = cefrEstimate(cefrBands(planetStats.values(), rankAfter.index));
      // A run by level is off the journey: its phrases move no planet's progress.
      const nextPlanetStats = runLevel
        ? planetStats
        : new Map(planetStats).set(exercise.planet, recordResult(planetStats.get(exercise.planet), exercise.planet, isSolid(result)));
      const cefrAfter = cefrEstimate(cefrBands(nextPlanetStats.values(), rankAfter.index));
      const cefrUp = Boolean(cefrAfter && cefrAfter !== cefrBefore);
      if (cefrUp) s.cefrNote = `New estimated English level: ${cefrAfter}.`;
      setPlanetStats(nextPlanetStats);

      // Economy: coins for the XP just earned, plus today's check-in and its streak effects. All
      // shown now; the server applies the same deltas and its answer replaces them.
      const today = localDay(now);
      setCalendar((c) => {
        const was = c.volume.get(today) ?? { phrases: 0, xp: 0 };
        return { ...c, checked: new Set(c.checked).add(today), volume: new Map(c.volume).set(today, { phrases: was.phrases + 1, xp: was.xp + gain.total }) };
      });
      // Once-ever rewards this phrase earned, by their deterministic keys: the server pays each once.
      const grants: string[] = [];
      if (change === "promotion") grants.push(`rank:${rankAfter.index}`);
      if (cefrUp) grants.push(`cefr:${cefrAfter}`);
      let coinGain = coinsForXp(gain.total);
      let crystalGain = (change === "promotion" ? CRYSTALS_PER_RANK_UP : 0) + (cefrUp ? CRYSTALS_PER_CEFR_UP : 0);
      let freezeGain = 0;
      const checkedForQuests = new Set(calendar.checked).add(today);
      if (!calendar.checked.has(today)) {
        const before = computeStreak(calendar.checked, calendar.frozen, today).current;
        const after = computeStreak(checkedForQuests, calendar.frozen, today).current;
        const hit = milestoneHit(before, after);
        if (hit) {
          const reward = milestoneReward(hit);
          coinGain += reward.coins;
          crystalGain += reward.crystals;
          freezeGain += reward.freezes;
          celebrate(streakReward(hit, reward));
          // Keyed by the streak's first day, so each streak pays each milestone once.
          grants.push(`milestone:${hit}:${addDays(today, 1 - after)}`);
        }
      }

      const changed = applyOutcome(wordStats, result.perWord);
      putWordStats(changed);
      setWordStats((m) => {
        const next = new Map(m);
        changed.forEach((c) => next.set(c.word, c));
        return next;
      });

      const updated = afterAttempt(prevReview, success, key, now);
      if (updated) {
        putReview(updated);
        setReview((m) => new Map(m).set(key, updated));
        s.review = updated.box === 0 ? "This one will come back for review." : `Back for review ${whenLabel(updated.dueAt, now)}.`;
      }

      // Missions, ticked from the signals this phrase just produced. A mission that reaches its
      // target waits for the learner to claim it (see claim below).
      const wk = weekKey(now);
      const newWords = changed.filter((c) => !wordStats.has(c.word)).length;
      const runLength = history.length + 1; // phrases solved in this run, this one included
      const ops: QuestOp[] = [
        maxOp("d_five_clean", nextCombo),
        ...(reviewKeys.has(key) ? [addOp("d_review_eight", 1)] : []),
        maxOp("w_five_days", daysStudiedInWeek(checkedForQuests, wk)), // recounted by the server
        addOp("w_new_words", newWords),
        ...(tier === "perfect" ? [addOp("w_perfect", 1)] : []),
        ...(mode === "timeAttack" ? [maxOp("w_time_attack", runLength)] : []),
        ...(mode === "survival" ? [maxOp("w_survival", runLength)] : []),
        ...(mode === "boss" ? [maxOp("w_storm", 1)] : []),
        ...(mode === "blind" ? [addOp("w_blind", 1)] : []),
      ];
      tickLocally(ops, now);

      s.coins = coinGain;
      s.crystals = crystalGain;
      bumpWallet({ coins: coinGain, crystals: crystalGain, freezes: freezeGain });

      // Mission badges: a handful of concrete, lifetime achievements.
      const unlocked = unlockedBadges();
      const hour = localHour(now);
      const earned: BadgeId[] = [];
      if (s.tier === "perfect") earned.push("first_perfect");
      if (!result.helped && noHintCount() + 1 >= 100) earned.push("no_hint_100");
      if (hour < 7) earned.push("early_bird");
      if (hour >= 23) earned.push("night_owl");
      const fresh = earned.filter((id) => !unlocked.has(id));
      for (const id of fresh) {
        grants.push(`badge:${id}`);
        celebrate(badgeReward(BADGE_BY_ID.get(id)!));
      }
      setGains((g) => addGains(g, { xp: gain.total, coins: coinGain, crystals: crystalGain, freezes: freezeGain, badges: fresh }));

      // The phrase first, then its rewards: a rank-up is checked against the XP the phrase adds.
      // Offline, both wait in the outbox in that order.
      completePhrase({
        eventId: attemptId,
        planet: runLevel ? null : exercise.planet,
        words: exercise.words.length,
        xp: gain.total,
        rpDelta: after.rp - player.rp,
        solid: isSolid(result),
        noHint: !result.helped,
        seconds: Math.max(1, Math.round(result.elapsedMs / 1000)),
        quests: ops,
        day: today,
      })
        .then(async (r) => {
          if (r) settlePhrase(r);
          for (const grant of grants) {
            const g = await grantReward(grant);
            if (g) settleWallet(g.wallet);
          }
        })
        .catch(failed);
    }
    if (mode === "survival" && result.typedErrors > 0) {
      let nextLives = lives - 1;
      if (nextLives <= 0 && full && getOxygen() - tanksPending.current > 0) {
        tanksPending.current++;
        spendOxygen(newEventId())
          .then((r) => {
            if (r) tanksPending.current--;
          })
          .catch(failed);
        s.oxygenNote = "Oxygen tank used — back in the game!";
        nextLives = 1;
      }
      setLives(Math.max(0, nextLives));
    }
    setCombo(nextCombo);
    setScore((v) => v + points);
    summaryAt.current = performance.now();
    setSummary(s);
    setHistory((h) => [...h, s]);
    speak(sentenceOf(exercise), speed, undefined, accent);
  };

  /** Ends the run. The score lives on only as a personal record per mode, shown on the end screen. */
  const finishSession = (completed: boolean) => {
    if (finished.current) return;
    finished.current = true;
    stopSpeech();
    if (full && completed && mode === "classic") {
      const now = new Date();
      const ops = [maxOp("d_full_flight", 1)];
      tickLocally(ops, now);
      sendQuests(newEventId(), ops, localDay(now))
        .then((r) => {
          if (r && !r.replayed && ledgerIdle()) setQuests((rows) => r.quests.reduce(withRow, rows));
        })
        .catch(failed);
    }
    setPrevBest(full ? bestFor(mode) : null);
    if (full) putBest(mode, score);
    setScreen("end");
  };

  const next = () => {
    if (performance.now() - summaryAt.current < SUMMARY_SETTLE_MS) return;
    if (advanced.current === attemptId) return;
    advanced.current = attemptId;
    stopSpeech();
    setSummary(null);
    if (mode === "survival" && lives <= 0) finishSession(false);
    else if (index + 1 >= total) finishSession(true);
    else {
      setIndex((i) => i + 1);
      setAttemptId(newEventId());
      setReplay(0);
    }
  };

  useEffect(() => {
    if (!summary) return;
    const onKey = (e: KeyboardEvent) => {
      // A focused button (the autofocused Next) already handles its own Enter.
      if (e.target instanceof HTMLElement && e.target.closest("button")) return;
      if (e.key === "Enter" && !e.repeat && !promo) next();
    };
    // Attached on the next task: the Enter that finished the phrase is still bubbling up to
    // window when this effect runs (discrete events flush effects synchronously), and must not
    // also skip the summary it just opened.
    const t = setTimeout(() => window.addEventListener("keydown", onKey));
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, index, promo]);

  useEffect(() => {
    if (screen !== "intro" || !full) return;
    loadReview().then((list) => setReview(new Map(list.map((r) => [r.phrase, r]))));
    loadWordStats().then((list) => setWordStats(new Map(list.map((w) => [w.word, w]))));
    loadPlayer().then(setPlayer);
    loadPlanetStats().then((list) => setPlanetStats(new Map(list.map((p) => [p.planet, p]))));
    loadQuests().then(setQuests);
    loadBadges();
    loadInventory();
    loadBests();
    getProfile().then((p) => {
      setFullName(p?.fullName);
      syncTimeZone(p);
    });
    // The day's streak upkeep runs on the server once per local day (however many tabs or
    // devices open the app): a shield for a single missed day, then study interest.
    Promise.all([loadWallet(), loadCalendar()]).then(async ([loaded, cal]) => {
      showWallet(loaded);
      setCalendar(cal);
      try {
        const r = await applyDaily(localDay(new Date()));
        if (!r) return;
        const frozenDay = r.frozenDay;
        if (frozenDay) {
          setCalendar((c) => ({ ...c, frozen: new Set(c.frozen).add(frozenDay) }));
          setFreezeNote(`Streak Shield used for ${frozenDay}. Your orbit holds.`);
        }
        settleWallet(r.wallet);
      } catch (e) {
        // Offline or refused: it runs again next time the app opens today.
        console.error(e);
      }
    });
  }, [screen, full]);

  // Intents left in the outbox by a network failure go out now, and whenever the browser is back
  // online; once delivered, the server's state replaces what was shown. Another tab playing at the
  // same time says when it changed something, and this one reloads (a burst reloads once).
  useEffect(() => {
    if (!full) return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      clearTimeout(pending);
      pending = setTimeout(() => {
        if (ledgerIdle()) resync();
      }, 400);
    };
    const offOutbox = onOutboxDelivered(reload);
    const offTabs = onOtherTabChanged(reload);
    flushOutbox();
    return () => {
      clearTimeout(pending);
      offOutbox();
      offTabs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  useEffect(() => {
    if (!syncNote) return;
    const t = setTimeout(() => setSyncNote(null), 6000);
    return () => clearTimeout(t);
  }, [syncNote]);

  useEffect(() => {
    loadContent().then((c) => {
      if (c.source === "remote") setLibrary(c.exercises);
    });
  }, []);

  /**
   * Starts a run in `requested` (the picked mode unless a shortcut says otherwise). With a `level`
   * (Free mode by level), members play that difficulty on phrases up to its CEFR band, off the journey.
   */
  const start = (requested: GameMode = playMode, level: Difficulty | null = null) => {
    const runMode = modeUnlocked(requested, playerLevel) ? requested : "classic";
    const byLevel = full && level !== null;
    // Members on the journey: nothing to start until the stop they're on has phrases.
    if (full && !byLevel && !continueId) return;
    const pool = library;
    setMode(runMode);
    setRunLevel(byLevel ? level : null);
    const chosen = continueId ?? PLANETS[0].id;
    if (full) setDifficulty(runMode === "blind" ? "extreme" : byLevel ? level : pickDifficulty(rank.index, planetStats.get(chosen)));
    // Guests keep to the first two course planets; members play the journey stop picked (or the one
    // they're on), or everything up to the level's CEFR band.
    const planetPool = (byLevel ? levelPool(pool, level) : pool).filter(
      (e) => (byLevel || (full ? e.planet === chosen : STARTER_PLANETS.includes(e.planet))) && (canExtend || e.words.length <= 6),
    );
    if (full && !byLevel) {
      const entered = markEntered(planetStats.get(chosen), chosen, new Date());
      if (entered !== planetStats.get(chosen)) {
        setPlanetStats((m) => new Map(m).set(chosen, entered));
        enterPlanet(chosen).catch(failed);
      }
    }
    const basePool = planetPool.length ? planetPool : pool;

    let plan: SessionPlan;
    if (runMode === "boss") {
      // One long, tough phrase — the toughest the planet has to offer.
      const boss = [...basePool].sort((a, b) => b.words.length - a.words.length)[0] ?? basePool[0];
      plan = { exercises: boss ? [boss] : [], review: new Set(), practice: new Set() };
    } else if (runMode === "timeAttack" || runMode === "survival") {
      // A generous, shuffled, repeating supply so the clock (or your lives) runs out first.
      const shuffled = [...basePool].sort(() => Math.random() - 0.5);
      const exercises = Array.from({ length: 8 }, () => shuffled).flat();
      plan = { exercises, review: new Set(), practice: new Set() };
    } else {
      // Reviews can come from any planet on the journey; by level, only from what the level plays.
      const byText = new Map((byLevel ? basePool : pool).map((e) => [sentenceOf(e), e]));
      const dueEx = (full ? dueList(review.values(), new Date()) : [])
        .map((r) => byText.get(r.phrase))
        .filter((e): e is Exercise => Boolean(e));
      const tricky = new Map((full ? trickyList(wordStats.values()) : []).map((w) => [w.word, rate(w)]));
      plan = buildSession(basePool, dueEx, tricky);
    }

    setReviewKeys(new Set([...plan.review].map(sentenceOf)));
    setPracticeKeys(new Set([...plan.practice].map(sentenceOf)));
    setExercises(plan.exercises);
    setIndex(0);
    setReplay(0);
    setScore(0);
    setCombo(0);
    setSeconds(0);
    setHistory([]);
    setSummary(null);
    setGains(emptyGains);
    setToasts([]);
    setStartedWith({ xp: player.xp, quests, checkedIn: calendar.checked.has(localDay(new Date())) });
    setAttemptId(newEventId());
    tanksPending.current = 0;
    finished.current = false;
    setLives(SURVIVAL_LIVES);
    setTimeLeft(TIME_ATTACK_SECONDS);
    setScreen("play");
  };

  const trickyCount = full ? [...wordStats.values()].filter(isTricky).length : 0;
  const dueCount = full ? dueList(review.values(), new Date()).length : 0;

  if (auth === "loading")
    return (
      <main className="shell center">
        <p className="muted">Loading…</p>
      </main>
    );

  if (auth === "gate")
    return (
      <AuthGate
        onMember={() => {
          writeGuest(false);
          setScreen("intro");
          setAuth("member");
        }}
        onGuest={() => {
          writeGuest(true);
          setScreen("intro");
          setAuth("guest");
        }}
      />
    );

  if (screen === "modes")
    return (
      <ModePicker
        mode={playMode}
        onSelectMode={setMode}
        planetId={planetId}
        onSelectPlanet={(id) => {
          setPlanetId(id);
          setFreeLevel(null);
        }}
        rp={rpNow}
        canStart={Boolean(continueId)}
        stuckAt={currentStop.name}
        stats={planetStats}
        counts={courseCounts}
        level={freeLevel}
        onSelectLevel={setFreeLevel}
        levelCounts={Object.fromEntries(DIFFICULTIES.map((d) => [d, levelPool(library, d).length])) as Record<Difficulty, number>}
        onStart={() => start(playMode, freeLevel)}
        onBack={() => setScreen("intro")}
      />
    );

  if (screen === "quests") return <QuestBoard rows={quests} level={playerLevel} onClaim={claim} onBack={() => setScreen("intro")} />;

  if (screen === "shop")
    return (
      <Shop
        wallet={wallet}
        onBuy={buy}
        onBack={() => setScreen("intro")}
      />
    );

  if (screen === "profile")
    return (
      <Profile
        player={player}
        wallet={wallet}
        calendar={calendar}
        planetStats={planetStats}
        trickyCount={trickyCount}
        savedCount={0}
        onBack={() => setScreen("intro")}
        onWords={() => setScreen("words")}
        onTricky={() => setScreen("tricky")}
        onQuests={() => setScreen("quests")}
        onShop={() => setScreen("shop")}
        onSettings={() => setScreen("settings")}
        canStudy={Boolean(continueId)}
        onStudy={() => start("classic")}
        onSignedOut={() => {
          setReview(new Map());
          setWordStats(new Map());
          setScreen("intro");
          setAuth("gate");
        }}
      />
    );

  if (screen === "settings") return <ProfileSettings onBack={() => setScreen("profile")} />;

  if (screen === "tricky") return <TrickyWords stats={[...wordStats.values()]} onBack={() => setScreen("profile")} />;

  if (screen === "words") return <MyWords onBack={() => setScreen("profile")} />;

  if (screen === "intro") {
    return (
      <main className="shell home">
        <TopBar
          full={full}
          name={fullName}
          rank={rank}
          level={lvl.level}
          streak={streak.current}
          coins={wallet.coins}
          crystals={wallet.crystals}
          onViewProfile={() => setScreen("profile")}
          onShop={() => setScreen("shop")}
          onSignOut={async () => {
            await signOut();
            setReview(new Map());
            setWordStats(new Map());
            setScreen("intro");
            setAuth("gate");
          }}
          onSignIn={() => setAuth("gate")}
        />
        <div className="home-grid">
        {full && (
          <aside className="home-side home-left">
            <PlayerCard name={fullName} rank={rank} xp={player.xp} streak={streak.current} wallet={wallet} onProfile={() => setScreen("profile")} />
          </aside>
        )}
        <div className="home-body">
        {dueCount > 0 && (
          <p className="muted">
            <b className="accent">{dueCount}</b> {dueCount === 1 ? "sentence is" : "sentences are"} ready for review.
          </p>
        )}
        {slipped && <p className="muted rank-slip">Welcome back. Your rank slipped a little while you were away. It returns as you study.</p>}
        {freezeNote && (
          <p className="muted rank-slip icon-text">
            <Shield /> {freezeNote}
          </p>
        )}

        {!full && (
          <>
            <div className="levels" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === d}
                  className={`level ${difficulty === d ? "on" : ""}`}
                  onClick={() => setDifficulty(d)}
                >
                  {DIFFICULTY[d].label}
                </button>
              ))}
            </div>
            <p className="muted level-blurb">
              {DIFFICULTY[difficulty].blurb} <span className="accent">×{DIFFICULTY[difficulty].scoreMult}</span>
            </p>
            <button type="button" className="check big" onClick={() => start()}>
              Start <ArrowRight />
            </button>
          </>
        )}

        {full && (
          <>
            <div className="home-actions narrow-only">
              <button type="button" className="check big home-continue" disabled={!continueId} onClick={() => start("classic")}>
                {continueId ? (
                  <>
                    <Play /> Continue on {PLANET_BY_ID.get(continueId)!.name}
                  </>
                ) : (
                  `${currentStop.name} · phrases coming soon`
                )}
              </button>
              <div className="home-secondary">
                <button type="button" className="check ghost" onClick={() => setScreen("modes")}>
                  <Compass /> Free mode
                </button>
                <button type="button" className="check ghost" onClick={() => setScreen("quests")}>
                  <Target /> Missions
                </button>
              </div>
              <DailyMissions quests={quests} onClaim={claim} onAll={() => setScreen("quests")} />
            </div>
            <h1 className="home-tagline">Follow your journey through the learning space</h1>
          </>
        )}

        {full && (
          <Courses
            stats={planetStats}
            counts={courseCounts}
            current={planetId}
            onSelect={setPlanetId}
          />
        )}

        {auth === "guest" && (
          <div className="guest-box">
            <span className="muted">Playing as a guest: nothing is saved.</span>
            <button type="button" className="unlock" onClick={() => setAuth("gate")}>
              <span className="unlock-title icon-text">
                <Lock /> Sign in to unlock more
              </span>
              <span className="unlock-sub">Review, tricky words, saved words and your profile</span>
            </button>
          </div>
        )}
        </div>
        {full && (
          <aside className="home-side home-right">
            <MissionRail
              stop={currentStop}
              planet={continueId ? PLANET_BY_ID.get(continueId)! : null}
              quests={quests}
              onClaim={claim}
              onContinue={() => start("classic")}
              onFreeMode={() => setScreen("modes")}
              onMissions={() => setScreen("quests")}
              onShop={() => setScreen("shop")}
            />
          </aside>
        )}
        </div>
      </main>
    );
  }

  if (screen === "end") {
    const perfect = history.filter((h) => h.tier === "perfect").length;
    const missed = [...new Set(history.flatMap((h) => h.result.missed))];
    const heading =
      mode === "boss"
        ? history.length > 0
          ? "Solar Storm cleared!"
          : "Solar Storm"
        : mode === "timeAttack"
          ? "Time's up!"
          : mode === "survival"
            ? "Game over"
            : "Mission complete";
    const endless = mode === "timeAttack" || mode === "survival";
    return (
      <>
        <SessionEnd
          heading={heading}
          full={full}
          score={score}
          prevBest={prevBest}
          solved={endless ? { value: String(history.length), label: "Phrases solved" } : { value: `${perfect}/${total}`, label: "Perfect" }}
          time={fmt(seconds)}
          missed={missed}
          xpBefore={startedWith.xp}
          xpAfter={player.xp}
          gains={gains}
          questsBefore={startedWith.quests}
          questsAfter={quests}
          streak={streak.current}
          streakExtended={!startedWith.checkedIn && calendar.checked.has(localDay(new Date()))}
          onClaim={claim}
          onContinue={() => setScreen("intro")}
          onPlayAgain={() => start(playMode, runLevel)}
        />
        <RewardToasts rewards={toasts} onDismiss={dismissToast} />
        {syncNote && (
          <p className="sync-note" role="status">
            {syncNote}
          </p>
        )}
        {promo && <Promotion title={promo} onContinue={() => setPromo(null)} />}
      </>
    );
  }

  return (
    <main className="shell play">
      <div className="play-grid">
      <section className="panel">
        <header className="bar">
          <div className="bar-top">
            <span className="status">
              <i className="dot" /> {summary ? "Phrase complete" : "Your turn to type"}
              {full && (
                <span className="rank-chip">
                  {rank.title.name} <Stars n={rank.stars} />
                </span>
              )}
            </span>
            <div className="bar-actions">
              {reviewKeys.has(sentenceOf(exercise)) && <span className="level-badge review-badge">Review</span>}
              {practiceKeys.has(sentenceOf(exercise)) && <span className="level-badge review-badge">Practice</span>}
              {mode !== "classic" && <span className="level-badge mode-badge">{MODES.find((m) => m.id === mode)?.name}</span>}
              <span className="level-badge">{DIFFICULTY[difficulty].label}</span>
              <button
                type="button"
                className="icon"
                aria-label="Play audio"
                disabled={!DIFFICULTY[difficulty].replay}
                title={DIFFICULTY[difficulty].replay ? undefined : "Eclipse plays the audio once"}
                onClick={() => setAudioTick((t) => t + 1)}
              >
                <Volume size="md" />
              </button>
              <button
                type="button"
                className="icon"
                aria-label="Close"
                onClick={() => {
                  stopSpeech();
                  setScreen("intro");
                }}
              >
                <Close size="md" />
              </button>
            </div>
          </div>
          <div className="bar-metrics">
            {mode === "boss" ? (
              <span className="progress icon-text">
                <Storm /> Storm
              </span>
            ) : mode === "timeAttack" ? (
              <span className="progress icon-text">
                <Timer /> {fmt(timeLeft)}
              </span>
            ) : mode === "survival" ? (
              <span className="progress lives" role="img" aria-label={`${lives} of ${SURVIVAL_LIVES} lives left`}>
                {Array.from({ length: SURVIVAL_LIVES }, (_, i) => (i < lives ? <Heart key={i} /> : <HeartEmpty key={i} className="lost" />))}
              </span>
            ) : (
              <span className="progress">
                <b>{String(index + 1).padStart(2, "0")}</b> / {total}
              </span>
            )}
            <span className="metrics">
              {mode === "timeAttack" ? (
                <span>
                  Solved <b className="accent">{index}</b>
                </span>
              ) : (
                <span>
                  Practice time <b>{fmt(seconds)}</b>
                </span>
              )}
              <span className="icon-text">
                <Combo /> Combo <b>{combo}</b>
              </span>
            </span>
          </div>
          {full && <XpMeter xp={player.xp} />}
        </header>

        {summary ? (
          <div className="exercise summary">
            <div className="summary-grid">
            <div className="summary-phrase">
            <h1 className="target">{sentenceOf(exercise)}</h1>
            <p className="translation">{exercise.translation}</p>
            <div className="swap">
              <WordCards words={exercise.words} stumbled={new Set(summary.stumbled)} onHear={(w) => speak(w, 0.7)} />
            </div>
            </div>
            <div className="summary-rewards">
            <div className={`tier tier-${summary.tier}`}>{TIER_LABEL[summary.tier]}</div>
            <p className="muted">
              {TIER_COPY[summary.tier]}
              {summary.combo > 1 && (
                <span className="combo-chip icon-text">
                  <Combo /> Combo {summary.combo}
                </span>
              )}
            </p>
            {summary.xp && (
              <div className="xp-gain">
                <b className="accent">+{summary.xp.total} XP</b>
                <span className="xp-chips">
                  {summary.xp.answerShown ? <i>Answer shown: no XP</i> : <i>Base {summary.xp.base}</i>}
                  {summary.xp.firstTry > 0 && <i>First try +{summary.xp.firstTry}</i>}
                  {summary.xp.fast > 0 && <i>Fast +{summary.xp.fast}</i>}
                  {summary.xp.noHelp > 0 && <i>No hints +{summary.xp.noHelp}</i>}
                  {summary.xp.comeback > 0 && <i>Comeback +{summary.xp.comeback}</i>}
                  {summary.xp.mult !== 1 && !summary.xp.answerShown && <i>×{summary.xp.mult} {DIFFICULTY[difficulty].label}</i>}
                </span>
              </div>
            )}
            {summary.levelUp && <p className="review-note level-up">Level up! You reached level {summary.levelUp}.</p>}
            {(Boolean(summary.coins) || Boolean(summary.crystals)) && (
              <p className="review-note currency-row">
                <Currency r={{ coins: summary.coins, crystals: summary.crystals }} />
              </p>
            )}
            {summary.comebackNote && (
              <p className="review-note level-up icon-text">
                <Comeback /> {summary.comebackNote}
              </p>
            )}
            {summary.starNote && (
              <p className="review-note level-up icon-text">
                New star: <Stars n={summary.starNote.stars} /> {summary.starNote.title}
              </p>
            )}
            {summary.cefrNote && <p className="review-note level-up">{summary.cefrNote}</p>}
            {summary.oxygenNote && (
              <p className="review-note level-up icon-text">
                <Oxygen /> {summary.oxygenNote}
              </p>
            )}
            {summary.review && <p className="muted review-note">{summary.review}</p>}
            {summary.stumbled.length > 0 && (
              <p className="muted review-note">
                We&apos;ll keep an eye on the {new Set(summary.stumbled).size === 1 ? "word" : "words"} you paused on (highlighted). Tap a word
                to hear it slowly.
              </p>
            )}
            {full && <SaveChunks exercise={exercise} />}
            </div>
            </div>
            <div className="footer">
              <span />
              <button type="button" className="check" onClick={next} autoFocus>
                {index + 1 >= total ? "Finish" : "Next"} <ArrowRight />
                <kbd className="kbd-hint">Enter</kbd>
              </button>
            </div>
          </div>
        ) : (
          <ExerciseView
            key={`${index}-${replay}`}
            exercise={exercise}
            difficulty={difficulty}
            hidden={hidden}
            rate={speed}
            accent={accent}
            audioTick={audioTick}
            onTypedError={() => setCombo(0)}
            onComplete={complete}
            onReplay={() => setReplay((r) => r + 1)}
            onToggleHidden={() => setHidden((h) => !h)}
          />
        )}
      </section>
      <SessionSide
        full={full}
        gains={gains}
        combo={combo}
        bestCombo={Math.max(combo, ...history.map((h) => h.combo))}
        questsBefore={startedWith.quests}
        questsNow={quests}
      />
      </div>
      <RewardToasts rewards={toasts} onDismiss={dismissToast} />
      {syncNote && (
        <p className="sync-note" role="status">
          {syncNote}
        </p>
      )}
      {promo && <Promotion title={promo} onContinue={() => setPromo(null)} />}
    </main>
  );
}
