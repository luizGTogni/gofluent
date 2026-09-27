"use client";

import { useEffect, useRef, useState } from "react";
import { DIFFICULTIES, DIFFICULTY, scoreExercise, TIER_COPY, TIER_LABEL, type Difficulty, type Result, type Tier } from "@/lib/engine";
import { buildSession, loadContent } from "@/lib/content";
import { getAccount } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { afterAttempt, dueList, whenLabel, type ReviewState } from "@/lib/review";
import { loadReview, putReview } from "@/lib/reviewStore";
import { applyOutcome, isTricky, rate, trickyList, type WordStat } from "@/lib/wordStats";
import { loadWordStats, putWordStats } from "@/lib/wordStore";
import { EXERCISES, sentenceOf, type Exercise } from "@/lib/exercises";
import { speak, stopSpeech } from "@/lib/speech";
import { ExerciseView } from "./ExerciseView";
import { Account } from "./Account";
import { AuthGate } from "./AuthGate";
import { MyWords } from "./MyWords";
import { TrickyWords } from "./TrickyWords";
import { SaveChunks } from "./SaveChunks";
import { WordCards } from "./WordCards";

type Summary = { tier: Tier; points: number; combo: number; result: Result; review?: string; stumbled: string[] };
type Auth = "loading" | "gate" | "guest" | "member";
type Screen = "intro" | "play" | "end" | "words" | "tricky" | "account";

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
  const remote = useRef<Exercise[] | null>(null);
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
  const [slow, setSlow] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<Summary[]>([]);

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

  const exercise = exercises[index];

  const complete = (result: Result) => {
    const nextCombo = result.typedErrors === 0 ? combo + 1 : 0;
    const { tier, points } = scoreExercise(exercise.words, result, nextCombo, difficulty);
    const s: Summary = { tier, points, combo: nextCombo, result, stumbled: result.perWord.filter((w) => w.fails > 0).map((w) => w.word) };
    if (full) {
      const changed = applyOutcome(wordStats, result.perWord);
      putWordStats(changed);
      setWordStats((m) => {
        const next = new Map(m);
        changed.forEach((c) => next.set(c.word, c));
        return next;
      });

      const key = sentenceOf(exercise);
      const now = new Date();
      const updated = afterAttempt(review.get(key), result.typedErrors === 0 && !result.helped, key, now);
      if (updated) {
        putReview(updated);
        setReview((m) => new Map(m).set(key, updated));
        s.review = updated.box === 0 ? "This one will come back for review." : `Back for review ${whenLabel(updated.dueAt, now)}.`;
      }
    }
    setCombo(nextCombo);
    setScore((v) => v + points);
    setSummary(s);
    setHistory((h) => [...h, s]);
    speak(sentenceOf(exercise), slow ? 0.75 : 1);
  };

  const next = () => {
    stopSpeech();
    setSummary(null);
    if (index + 1 >= total) setScreen("end");
    else {
      setIndex((i) => i + 1);
      setReplay(0);
    }
  };

  useEffect(() => {
    if (!summary) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, index]);

  useEffect(() => {
    if (screen !== "intro" || !full) return;
    loadReview().then((list) => setReview(new Map(list.map((r) => [r.phrase, r]))));
    loadWordStats().then((list) => setWordStats(new Map(list.map((w) => [w.word, w]))));
  }, [screen, full]);

  useEffect(() => {
    loadContent().then((c) => {
      if (c.source === "remote") remote.current = c.exercises;
    });
  }, []);

  const start = () => {
    const pool = remote.current ?? EXERCISES;
    const byText = new Map(pool.map((e) => [sentenceOf(e), e]));
    const dueEx = (full ? dueList(review.values(), new Date()) : [])
      .map((r) => byText.get(r.phrase))
      .filter((e): e is Exercise => Boolean(e));
    const tricky = new Map((full ? trickyList(wordStats.values()) : []).map((w) => [w.word, rate(w)]));
    const plan = buildSession(pool, dueEx, tricky);
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

  if (screen === "account")
    return (
      <Account
        onBack={() => setScreen("intro")}
        onSignedOut={() => {
          setReview(new Map());
          setWordStats(new Map());
          setScreen("intro");
          setAuth("gate");
        }}
      />
    );

  if (screen === "tricky") return <TrickyWords stats={[...wordStats.values()]} onBack={() => setScreen("intro")} />;

  if (screen === "words") return <MyWords onBack={() => setScreen("intro")} />;

  if (screen === "intro") {
    return (
      <main className="shell center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="GoFluent" className="logo" />
        <h1 className="hero tagline">Make English part of your every day.</h1>
        <p className="muted">Listen. Type. Every key is practice. Today&apos;s mission: {total} short exercises.</p>
        {dueCount > 0 && (
          <p className="muted">
            <b className="accent">{dueCount}</b> {dueCount === 1 ? "sentence is" : "sentences are"} ready for review.
          </p>
        )}
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
        {auth === "guest" ? (
          <div className="guest-box">
            <span className="muted">Playing as a guest: nothing is saved.</span>
            <button type="button" className="unlock" onClick={() => setAuth("gate")}>
              <span className="unlock-title">🔒 Sign in to unlock more</span>
              <span className="unlock-sub">Review, tricky words and saved words</span>
            </button>
          </div>
        ) : (
          <div className="intro-links">
            {supabaseConfigured && (
              <button type="button" className="link" onClick={() => setScreen("words")}>
                My words
              </button>
            )}
            <button type="button" className="link" onClick={() => setScreen("tricky")}>
              Tricky words{trickyCount > 0 ? ` (${trickyCount})` : ""}
            </button>
            {supabaseConfigured && (
              <button type="button" className="link" onClick={() => setScreen("account")}>
                Account
              </button>
            )}
          </div>
        )}
      </main>
    );
  }

  if (screen === "end") {
    const perfect = history.filter((h) => h.tier === "perfect").length;
    const missed = [...new Set(history.flatMap((h) => h.result.missed))];
    return (
      <main className="shell center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="GoFluent" className="logo" />
        <h1 className="hero">Mission complete</h1>
        <div className="stats">
          <div>
            <b>{score}</b>
            <span>Score</span>
          </div>
          <div>
            <b>{perfect}/{total}</b>
            <span>Perfect</span>
          </div>
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
            </span>
            <div className="bar-actions">
              {reviewKeys.has(sentenceOf(exercise)) && <span className="level-badge review-badge">Review</span>}
              {practiceKeys.has(sentenceOf(exercise)) && <span className="level-badge review-badge">Practice</span>}
              <span className="level-badge">{DIFFICULTY[difficulty].label}</span>
              <button
                type="button"
                className="icon"
                aria-label="Play audio"
                disabled={!DIFFICULTY[difficulty].replay}
                title={DIFFICULTY[difficulty].replay ? undefined : "Extreme plays the audio once"}
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
            <span className="progress">
              <b>{String(index + 1).padStart(2, "0")}</b> / {total}
            </span>
            <span className="metrics">
              <span>
                Practice time <b>{fmt(seconds)}</b>
              </span>
              <span>
                Score <b className="accent">{score}</b>
              </span>
              <span>
                ⚡ Combo <b>{combo}</b>
              </span>
            </span>
          </div>
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
            slow={slow}
            audioTick={audioTick}
            onTypedError={() => setCombo(0)}
            onComplete={complete}
            onReplay={() => setReplay((r) => r + 1)}
            onToggleHidden={() => setHidden((h) => !h)}
            onToggleSlow={() => setSlow((s) => !s)}
          />
        )}
      </section>
    </main>
  );
}
