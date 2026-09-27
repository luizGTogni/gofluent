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
import { PLANET_BY_ID, PLANETS, type PlanetId } from "@/lib/planets";
import { canEnter, cefrBands, cefrEstimate, isSolid, markEntered, recordResult, type PlanetStat } from "@/lib/planetStats";
import { loadPlanetStats, putPlanetStat } from "@/lib/planetStore";
import { speak, stopSpeech } from "@/lib/speech";
import { loadPlayer, savePlayer } from "@/lib/playerStore";
import { effectiveRp, rankChange, rankOf, starsLabel } from "@/lib/ranks";
import type { Title } from "@/lib/titles";
import { addXp, emptyPlayer, levelFromXp, levelProgress, phraseXp, type PlayerState, type XpBreakdown } from "@/lib/xp";
import { extendedUnlocked, type Accent } from "@/lib/unlocks";
import { addDays, computeStreak, gapToFreeze, milestoneHit, utcDay } from "@/lib/streak";
import { pickDifficulty } from "@/lib/adaptive";
import { MODES, SURVIVAL_LIVES, TIME_ATTACK_SECONDS, type GameMode } from "@/lib/modes";
import { ModePicker } from "./ModePicker";
import { daysStudiedInWeek, QUEST_BY_ID, weekKey } from "@/lib/quests";
import { bumpQuest, getProgress, markClaimed, setProgress, type QuestProgress } from "@/lib/questStore";
import { unlockedBadges, unlockBadge, bumpNoHintCount } from "@/lib/badgeStore";
import { QuestBoard } from "./QuestBoard";
import { FREEZE_COST } from "@/lib/shop";
import { useOxygen } from "@/lib/shopStore";
import { Shop } from "./Shop";
import { getProfile, signOut } from "@/lib/auth";
import { coinsForXp, CRYSTALS_PER_CEFR_UP, CRYSTALS_PER_RANK_UP, dailyInterest, milestoneReward, type Wallet } from "@/lib/economy";
import {
  addFrozenDay,
  addStudySeconds,
  interestAppliedToday,
  loadCalendar,
  loadWallet,
  markInterestApplied,
  saveWallet,
  type StudyCalendar,
} from "@/lib/economyStore";
import { ExerciseView } from "./ExerciseView";
import { AuthGate } from "./AuthGate";
import { MyWords } from "./MyWords";
import { Profile } from "./Profile";
import { Promotion } from "./Promotion";
import { TopBar } from "./TopBar";
import { Courses } from "./Courses";
import { TrickyWords } from "./TrickyWords";
import { SaveChunks } from "./SaveChunks";
import { Heatmap } from "./Heatmap";
import { WordCards } from "./WordCards";

type Summary = {
  tier: Tier;
  points: number;
  combo: number;
  result: Result;
  review?: string;
  stumbled: string[];
  xp?: XpBreakdown;
  levelUp?: number;
  starNote?: string;
  coins?: number;
  crystalNote?: string;
  milestoneNote?: string;
  comebackNote?: string;
  questNote?: string;
  badgeNote?: string;
  oxygenNote?: string;
};
type Auth = "loading" | "gate" | "guest" | "member";
type Screen = "intro" | "modes" | "play" | "end" | "words" | "tricky" | "profile" | "quests" | "shop";

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
  const [planetId, setPlanetId] = useState<PlanetId>("earth");
  const [planetStats, setPlanetStats] = useState<Map<PlanetId, PlanetStat>>(new Map());
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
  const [calendar, setCalendar] = useState<StudyCalendar>({ checked: new Set(), frozen: new Set(), lastInterestDay: null });
  const [freezeNote, setFreezeNote] = useState<string | null>(null);
  const checkedInToday = useRef(false);
  const [fullName, setFullName] = useState<string | undefined>();
  const [mode, setMode] = useState<GameMode>("classic");
  const [lives, setLives] = useState(SURVIVAL_LIVES);
  const [timeLeft, setTimeLeft] = useState(TIME_ATTACK_SECONDS);

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
      setScreen("end");
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [screen, mode, timeLeft]);

  const nowDate = new Date();
  const rpNow = effectiveRp(player, nowDate);
  const rank = rankOf(rpNow);
  const held = rankOf(player.rp);
  const slipped = rank.index < held.index || (rank.index === held.index && rank.stars < held.stars);
  const lvl = levelProgress(player.xp);
  const canExtend = extendedUnlocked(rank.index);
  const streak = computeStreak(calendar.checked, calendar.frozen, utcDay(nowDate));
  const courseCounts = Object.fromEntries(PLANETS.map((p) => [p.id, library.filter((e) => e.planet === p.id).length])) as Record<PlanetId, number>;

  const exercise = exercises[index];

  const complete = (result: Result) => {
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
      if (cameBack) s.comebackNote = "🎯 Comeback! You finally nailed a phrase that used to trip you up.";
      const rpNow = effectiveRp(player, now);
      const before = rankOf(rpNow);
      const after = addXp({ ...player, rp: rpNow }, gain.total, now);
      savePlayer(after);
      setPlayer(after);
      s.xp = gain;
      const levelBefore = levelFromXp(player.xp);
      const levelAfter = levelFromXp(after.xp);
      if (levelAfter > levelBefore) s.levelUp = levelAfter;
      const rankAfter = rankOf(after.rp);
      const change = rankChange(before, rankAfter);
      if (change === "star") s.starNote = `${starsLabel(rankAfter.stars)} ${rankAfter.title.name}`;
      if (change === "promotion") setPromo(rankAfter.title);

      const cefrBefore = cefrEstimate(cefrBands(planetStats.values(), rankAfter.index));
      const planetStat = recordResult(planetStats.get(exercise.planet), exercise.planet, isSolid(result));
      putPlanetStat(planetStat);
      setPlanetStats((m) => {
        const next = new Map(m).set(exercise.planet, planetStat);
        const cefrAfter = cefrEstimate(cefrBands(next.values(), rankAfter.index));
        if (cefrAfter && cefrAfter !== cefrBefore) s.crystalNote = `New estimated level: ${cefrAfter}. +${CRYSTALS_PER_CEFR_UP} crystals.`;
        return next;
      });

      // Economy: coins for the XP just earned, plus today's check-in and its streak effects.
      addStudySeconds(Math.max(1, Math.round(result.elapsedMs / 1000)));
      let coinGain = coinsForXp(gain.total);
      let crystalGain = (change === "promotion" ? CRYSTALS_PER_RANK_UP : 0) + (s.crystalNote ? CRYSTALS_PER_CEFR_UP : 0);
      let freezeGain = 0;
      let checkedForQuests = calendar.checked;
      if (!checkedInToday.current) {
        checkedInToday.current = true;
        const today = utcDay(now);
        const before = computeStreak(calendar.checked, calendar.frozen, today).current;
        const nextChecked = new Set(calendar.checked).add(today);
        checkedForQuests = nextChecked;
        setCalendar((c) => ({ ...c, checked: nextChecked }));
        const after = computeStreak(nextChecked, calendar.frozen, today).current;
        const hit = milestoneHit(before, after);
        if (hit) {
          const reward = milestoneReward(hit);
          coinGain += reward.coins;
          crystalGain += reward.crystals;
          freezeGain += reward.freezes;
          s.milestoneNote = `🛰️ ${hit}-day orbit! +${reward.coins} Lunar Coins, +${reward.crystals} Crystals, +${reward.freezes} shield${reward.freezes === 1 ? "" : "s"}.`;
        }
      }
      s.coins = coinGain;
      setWallet((w) => {
        const next = { coins: w.coins + coinGain, crystals: w.crystals + crystalGain, freezes: w.freezes + freezeGain };
        saveWallet(next);
        return next;
      });

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

      // Missions: daily and weekly quests, ticked from signals this run just produced. Progress
      // and rewards are granted the moment a quest first hits its target (see questStore.ts).
      const today = utcDay(now);
      const wk = weekKey(now);
      let questCoinGain = 0;
      let questCrystalGain = 0;
      const questNotes: string[] = [];
      const grant = (row: QuestProgress) => {
        const def = QUEST_BY_ID.get(row.id);
        if (!def || row.count < def.target || row.claimed) return;
        markClaimed(row.id, row.periodKey);
        questCoinGain += def.coins;
        questCrystalGain += def.crystals ?? 0;
        questNotes.push(`🎯 ${def.name} complete! +${def.coins} Lunar Coins${def.crystals ? `, +${def.crystals} Crystal` : ""}.`);
      };

      grant(bumpQuest("d_ten_phrases", today, 1, QUEST_BY_ID.get("d_ten_phrases")!.target));
      grant(
        setProgress(
          "d_five_streak",
          today,
          Math.max(getProgress("d_five_streak", today).count, nextCombo),
          QUEST_BY_ID.get("d_five_streak")!.target,
        ),
      );
      if (reviewKeys.has(key)) grant(bumpQuest("d_review_eight", today, 1, QUEST_BY_ID.get("d_review_eight")!.target));

      grant(setProgress("w_five_days", wk, daysStudiedInWeek(checkedForQuests, wk), QUEST_BY_ID.get("w_five_days")!.target));
      grant(bumpQuest("w_deep_practice", wk, 1, QUEST_BY_ID.get("w_deep_practice")!.target));
      const newWords = changed.filter((c) => !wordStats.has(c.word)).length;
      if (newWords > 0) grant(bumpQuest("w_new_words", wk, newWords, QUEST_BY_ID.get("w_new_words")!.target));

      if (questNotes.length) s.questNote = questNotes.join(" ");
      if (questCoinGain || questCrystalGain) {
        setWallet((w) => {
          const next = { ...w, coins: w.coins + questCoinGain, crystals: w.crystals + questCrystalGain };
          saveWallet(next);
          return next;
        });
      }

      // Mission badges: a handful of concrete, lifetime achievements.
      const badgeNotes: string[] = [];
      const unlocked = unlockedBadges();
      if (s.tier === "perfect" && !unlocked.has("first_perfect")) {
        unlockBadge("first_perfect");
        badgeNotes.push("🌟 Badge unlocked: First Perfect!");
      }
      if (!result.helped && bumpNoHintCount() >= 100 && !unlocked.has("no_hint_100")) {
        unlockBadge("no_hint_100");
        badgeNotes.push("💪 Badge unlocked: No Hints, 100 Phrases!");
      }
      const hour = now.getHours();
      if (hour < 7 && !unlocked.has("early_bird")) {
        unlockBadge("early_bird");
        badgeNotes.push("🌅 Badge unlocked: Early Bird!");
      }
      if (hour >= 23 && !unlocked.has("night_owl")) {
        unlockBadge("night_owl");
        badgeNotes.push("🦉 Badge unlocked: Night Owl!");
      }
      if (badgeNotes.length) s.badgeNote = badgeNotes.join(" ");
    }
    if (mode === "survival" && result.typedErrors > 0) {
      setLives((l) => {
        const next = l - 1;
        if (next > 0) return next;
        if (useOxygen()) {
          s.oxygenNote = "🫧 Oxygen tank used — back in the game!";
          return 1;
        }
        return 0;
      });
    }
    setCombo(nextCombo);
    setScore((v) => v + points);
    setSummary(s);
    setHistory((h) => [...h, s]);
    speak(sentenceOf(exercise), speed, undefined, accent);
  };

  const next = () => {
    stopSpeech();
    setSummary(null);
    if (mode === "survival" && lives <= 0) setScreen("end");
    else if (index + 1 >= total) setScreen("end");
    else {
      setIndex((i) => i + 1);
      setReplay(0);
    }
  };

  useEffect(() => {
    if (!summary) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat && !promo) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, index, promo]);

  useEffect(() => {
    if (screen !== "intro" || !full) return;
    loadReview().then((list) => setReview(new Map(list.map((r) => [r.phrase, r]))));
    loadWordStats().then((list) => setWordStats(new Map(list.map((w) => [w.word, w]))));
    loadPlayer().then(setPlayer);
    loadPlanetStats().then((list) => setPlanetStats(new Map(list.map((p) => [p.planet, p]))));
    loadWallet().then(setWallet);
    getProfile().then((p) => setFullName(p?.fullName));
    loadCalendar().then(async (cal) => {
      const today = utcDay(new Date());
      const gap = gapToFreeze(cal.checked, today);
      let nextWallet: Wallet | null = null;
      if (gap) {
        setWallet((w) => {
          if (w.freezes <= 0) return w;
          nextWallet = { ...w, freezes: w.freezes - 1 };
          return nextWallet;
        });
        if (nextWallet) {
          await addFrozenDay(gap);
          await saveWallet(nextWallet);
          cal.frozen.add(gap);
          setFreezeNote(`⚡ Energy shield used for ${gap}. Your orbit holds.`);
        }
      }
      setCalendar(cal);
      checkedInToday.current = cal.checked.has(today);

      const streakSoFar = computeStreak(cal.checked, cal.frozen, addDays(today, -1)).current;
      if (streakSoFar > 0 && !(await interestAppliedToday())) {
        const bonus = dailyInterest(streakSoFar, (nextWallet ?? wallet).coins);
        if (bonus > 0) {
          setWallet((w) => ({ ...w, coins: w.coins + bonus }));
          saveWallet({ ...(nextWallet ?? wallet), coins: (nextWallet ?? wallet).coins + bonus });
        }
        markInterestApplied();
      }
    });
  }, [screen, full]);

  useEffect(() => {
    loadContent().then((c) => {
      if (c.source === "remote") setLibrary(c.exercises);
    });
  }, []);

  const start = () => {
    const pool = library;
    if (full) setDifficulty(mode === "blind" ? "extreme" : pickDifficulty(rank.index, planetStats.get(planetId)));
    // Guests keep to the first two planets; members play the planet they picked (falling back to Earth).
    const chosen = full && canEnter(PLANET_BY_ID.get(planetId)!, rank, planetStats.get(planetId)) ? planetId : "earth";
    const planetPool = pool.filter(
      (e) => (full ? e.planet === chosen : e.planet === "earth" || e.planet === "aurelia") && (canExtend || e.words.length <= 6),
    );
    if (full) {
      const entered = markEntered(planetStats.get(chosen), chosen, new Date());
      if (entered !== planetStats.get(chosen)) {
        putPlanetStat(entered);
        setPlanetStats((m) => new Map(m).set(chosen, entered));
      }
    }
    const basePool = planetPool.length ? planetPool : pool;

    let plan: SessionPlan;
    if (mode === "boss") {
      // One long, tough phrase — the toughest the planet has to offer.
      const boss = [...basePool].sort((a, b) => b.words.length - a.words.length)[0] ?? basePool[0];
      plan = { exercises: boss ? [boss] : [], review: new Set(), practice: new Set() };
    } else if (mode === "timeAttack" || mode === "survival") {
      // A generous, shuffled, repeating supply so the clock (or your lives) runs out first.
      const shuffled = [...basePool].sort(() => Math.random() - 0.5);
      const exercises = Array.from({ length: 8 }, () => shuffled).flat();
      plan = { exercises, review: new Set(), practice: new Set() };
    } else {
      const byText = new Map(pool.map((e) => [sentenceOf(e), e])); // reviews can come from any planet
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
        mode={mode}
        onSelectMode={setMode}
        planetId={planetId}
        onSelectPlanet={setPlanetId}
        rank={rank}
        stats={planetStats}
        counts={courseCounts}
        onStart={start}
        onBack={() => setScreen("intro")}
      />
    );

  if (screen === "quests") return <QuestBoard onBack={() => setScreen("intro")} />;

  if (screen === "shop")
    return (
      <Shop
        wallet={wallet}
        onSpend={(coins, crystals) => {
          if (wallet.coins < coins || wallet.crystals < crystals) return false;
          setWallet((w) => {
            const next = { ...w, coins: w.coins - coins, crystals: w.crystals - crystals };
            saveWallet(next);
            return next;
          });
          return true;
        }}
        onBuyFreeze={() => {
          if (wallet.coins < FREEZE_COST) return false;
          setWallet((w) => {
            const next = { ...w, coins: w.coins - FREEZE_COST, freezes: w.freezes + 1 };
            saveWallet(next);
            return next;
          });
          return true;
        }}
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
        onSignedOut={() => {
          setReview(new Map());
          setWordStats(new Map());
          setScreen("intro");
          setAuth("gate");
        }}
      />
    );

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
          onSignOut={async () => {
            await signOut();
            setReview(new Map());
            setWordStats(new Map());
            setScreen("intro");
            setAuth("gate");
          }}
          onSignIn={() => setAuth("gate")}
        />
        <div className="home-body">
        {dueCount > 0 && (
          <p className="muted">
            <b className="accent">{dueCount}</b> {dueCount === 1 ? "sentence is" : "sentences are"} ready for review.
          </p>
        )}
        {slipped && <p className="muted rank-slip">Welcome back. Your rank slipped a little while you were away. It returns as you study.</p>}
        {freezeNote && <p className="muted rank-slip">{freezeNote}</p>}

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
            <button type="button" className="check big" onClick={start}>
              Start →
            </button>
          </>
        )}

        {full && (
          <>
            <button type="button" className="check big" onClick={() => setScreen("modes")}>
              🚀 Free mode
            </button>
            <h1 className="home-tagline">Follow your journey through the learning space</h1>
            <button type="button" className="link small" onClick={() => setScreen("quests")}>
              🎯 Missions
            </button>
          </>
        )}

        {full && (
          <Courses
            rank={rank}
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
              <span className="unlock-title">🔒 Sign in to unlock more</span>
              <span className="unlock-sub">Review, tricky words, saved words and your profile</span>
            </button>
          </div>
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
          ? "☀️ Solar Storm cleared!"
          : "☀️ Solar Storm"
        : mode === "timeAttack"
          ? "⏱️ Time's up!"
          : mode === "survival"
            ? "💥 Game over"
            : "Mission complete";
    return (
      <main className="shell center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="GoFluent" className="logo" />
        <h1 className="hero">{heading}</h1>
        <div className="stats">
          <div>
            <b>{score}</b>
            <span>Score</span>
          </div>
          {mode === "timeAttack" || mode === "survival" ? (
            <div>
              <b>{history.length}</b>
              <span>Phrases solved</span>
            </div>
          ) : (
            <div>
              <b>{perfect}/{total}</b>
              <span>Perfect</span>
            </div>
          )}
          <div>
            <b>{fmt(seconds)}</b>
            <span>Practice time</span>
          </div>
        </div>
        {missed.length > 0 ? (
          <p className="muted">
            To revisit: <span className="missed">{missed.join(", ")}</span>
          </p>
        ) : (
          <p className="muted">No slips this time. Your fingers can take it from here.</p>
        )}
        <button type="button" className="check big" onClick={start}>
          Practice again →
        </button>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="panel">
        <header className="bar">
          <div className="bar-top">
            <span className="status">
              <i className="dot" /> {summary ? "Well done" : "Your turn to type"}
              {full && (
                <span className="rank-chip">
                  Lv {lvl.level} · {rank.title.name} <span className="stars">{starsLabel(rank.stars)}</span>
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
                🔊
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
                ✕
              </button>
            </div>
          </div>
          <div className="bar-metrics">
            {mode === "boss" ? (
              <span className="progress">☀️ Storm</span>
            ) : mode === "timeAttack" ? (
              <span className="progress">⏱️ {fmt(timeLeft)}</span>
            ) : mode === "survival" ? (
              <span className="progress lives">{"❤️".repeat(lives)}{"🖤".repeat(SURVIVAL_LIVES - lives)}</span>
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
              <span>
                Score <b className="accent">{score}</b>
              </span>
              <span>
                ⚡ Combo <b>{combo}</b>
              </span>
            </span>
          </div>
          {full && (
            <div className="xpbar xpbar-thin" aria-label={`${lvl.pct}% to level ${lvl.level + 1}`}>
              <span style={{ width: `${lvl.pct}%` }} />
            </div>
          )}
        </header>

        {summary ? (
          <div className="exercise">
            <h1 className="target">{sentenceOf(exercise)}</h1>
            <p className="translation">{exercise.translation}</p>
            <div className="swap">
              <WordCards words={exercise.words} />
            </div>
            <div className={`tier tier-${summary.tier}`}>{TIER_LABEL[summary.tier]}</div>
            <p className="muted">
              {TIER_COPY[summary.tier]} <b className="accent">+{summary.points}</b>
              {summary.combo > 0 && ` · Nice · Combo ${summary.combo}`}
            </p>
            {summary.xp && (
              <div className="xp-gain">
                <b className="accent">+{summary.xp.total} XP</b>
                <span className="xp-chips">
                  <i>Base {summary.xp.base}</i>
                  {summary.xp.firstTry > 0 && <i>First try +{summary.xp.firstTry}</i>}
                  {summary.xp.fast > 0 && <i>Fast +{summary.xp.fast}</i>}
                  {summary.xp.noHelp > 0 && <i>No hints +{summary.xp.noHelp}</i>}
                  {summary.xp.comeback > 0 && <i>Comeback +{summary.xp.comeback}</i>}
                  {summary.xp.mult !== 1 && <i>×{summary.xp.mult} {DIFFICULTY[difficulty].label}</i>}
                </span>
              </div>
            )}
            {summary.comebackNote && <p className="review-note level-up">{summary.comebackNote}</p>}
            {summary.levelUp && <p className="review-note level-up">Level up! You reached level {summary.levelUp}.</p>}
            {summary.starNote && <p className="review-note level-up">New star: {summary.starNote}</p>}
            {summary.coins !== undefined && summary.coins > 0 && <p className="review-note coin-note">🪙 +{summary.coins} Lunar Coins</p>}
            {summary.crystalNote && <p className="review-note level-up">{summary.crystalNote}</p>}
            {summary.milestoneNote && <p className="review-note level-up">{summary.milestoneNote}</p>}
            {summary.questNote && <p className="review-note level-up">{summary.questNote}</p>}
            {summary.badgeNote && <p className="review-note level-up">{summary.badgeNote}</p>}
            {summary.oxygenNote && <p className="review-note level-up">{summary.oxygenNote}</p>}
            {summary.review && <p className="muted review-note">{summary.review}</p>}
            {summary.stumbled.length > 0 && (
              <p className="muted review-note">
                You paused on{" "}
                {[...new Set(summary.stumbled)].map((w) => (
                  <button key={w} type="button" className="link word-chip" onClick={() => speak(w, 0.7)} title="Hear it slowly">
                    🔊 {w}
                  </button>
                ))}
                We&apos;ll keep an eye on {summary.stumbled.length === 1 ? "it" : "them"}.
              </p>
            )}
            {full && <SaveChunks exercise={exercise} />}
            <div className="footer">
              <span />
              <button type="button" className="check" onClick={next} autoFocus>
                {index + 1 >= total ? "Finish →" : "Next →"}
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
      {promo && <Promotion title={promo} onContinue={() => setPromo(null)} />}
    </main>
  );
}
