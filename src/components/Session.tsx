"use client";

import { useEffect, useState } from "react";
import { DIFFICULTIES, DIFFICULTY, scoreExercise, TIER_COPY, TIER_LABEL, type Difficulty, type Result, type Tier } from "@/lib/engine";
import { EXERCISES, sentenceOf } from "@/lib/exercises";
import { speak, stopSpeech } from "@/lib/speech";
import { ExerciseView } from "./ExerciseView";
import { WordCards } from "./WordCards";

type Summary = { tier: Tier; points: number; combo: number; result: Result };
type Screen = "intro" | "play" | "end";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const total = EXERCISES.length;

export function Session() {
  const [screen, setScreen] = useState<Screen>("intro");
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
    if (screen !== "play" || summary) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [screen, summary]);

  const exercise = EXERCISES[index];

  const complete = (result: Result) => {
    const nextCombo = result.typedErrors === 0 ? combo + 1 : 0;
    const { tier, points } = scoreExercise(exercise.words, result, nextCombo, difficulty);
    const s: Summary = { tier, points, combo: nextCombo, result };
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

  const start = () => {
    setIndex(0);
    setReplay(0);
    setScore(0);
    setCombo(0);
    setSeconds(0);
    setHistory([]);
    setSummary(null);
    setScreen("play");
  };

  if (screen === "intro") {
    return (
      <main className="shell center">
        <div className="brand">GoFluent</div>
        <h1 className="hero">Make English part of your every day.</h1>
        <p className="muted">Listen. Type. Every key is practice. {total} short exercises today.</p>
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
      </main>
    );
  }

  if (screen === "end") {
    const perfect = history.filter((h) => h.tier === "perfect").length;
    const missed = [...new Set(history.flatMap((h) => h.result.missed))];
    return (
      <main className="shell center">
        <div className="brand">GoFluent</div>
        <h1 className="hero">Session complete</h1>
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
