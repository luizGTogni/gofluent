"use client";

import { useEffect, useState } from "react";
import { BADGE_BY_ID } from "@/lib/badges";
import { plural } from "@/lib/format";
import { periodKeyFor, QUESTS } from "@/lib/quests";
import { progressFor, type QuestProgress } from "@/lib/questStore";
import type { SessionGains } from "@/lib/rewards";
import { XpMeter } from "./XpMeter";

type Props = {
  heading: string;
  /** Members see progress and rewards; guests only the run itself. */
  full: boolean;
  score: number;
  /** The best for this mode before this run, or null when nothing is recorded (guests). */
  prevBest: number | null;
  solved: { value: string; label: string };
  time: string;
  missed: string[];
  xpBefore: number;
  xpAfter: number;
  gains: SessionGains;
  questsBefore: QuestProgress[];
  questsAfter: QuestProgress[];
  streak: number;
  /** Did this session check in today, extending the orbit? */
  streakExtended: boolean;
  onContinue: () => void;
  onPlayAgain: () => void;
};

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts from 0 up to `target` over `ms`, or jumps straight there when motion is reduced. */
function useCountUp(target: number, ms = 900): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      setN(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

/**
 * The debrief: XP first (the level bar animates from where the session started), then what was
 * earned to spend, then missions, badges and the day's orbit. The score is a personal record,
 * shown only here.
 */
export function SessionEnd(p: Props) {
  const xpShown = useCountUp(p.gains.xp);
  const [meterXp, setMeterXp] = useState(p.xpBefore);
  useEffect(() => {
    const t = setTimeout(() => setMeterXp(p.xpAfter), 350);
    return () => clearTimeout(t);
  }, [p.xpAfter]);

  const now = new Date();
  const missions = QUESTS.map((q) => {
    const key = periodKeyFor(q, now);
    return { q, before: progressFor(p.questsBefore, q.id, key).count, after: progressFor(p.questsAfter, q.id, key).count };
  }).filter((m) => m.after > m.before);
  const newBest = p.prevBest !== null && p.score > p.prevBest && p.score > 0;
  const currencies = p.gains.coins > 0 || p.gains.crystals > 0 || p.gains.freezes > 0;

  return (
    <main className="shell center session-end">
      <h1 className="hero">{p.heading}</h1>

      {p.full && (
        <section className="end-card end-xp">
          <b className="end-xp-total accent">+{xpShown} XP</b>
          <XpMeter xp={meterXp} big />
        </section>
      )}

      {p.full && currencies && (
        <p className="end-currencies">
          {p.gains.coins > 0 && <span className="coin-note">🪙 +{p.gains.coins} Lunar Coins</span>}
          {p.gains.crystals > 0 && <span className="crystal-note">💎 +{p.gains.crystals} Crystals</span>}
          {p.gains.freezes > 0 && <span>🛡️ +{plural(p.gains.freezes, "Streak Shield")}</span>}
        </p>
      )}

      {p.full && (
        <section className="end-card end-streak">
          <b>🛰️ {p.streak}-day orbit</b>
          <span className="muted">{p.streakExtended ? "+1 today. Your orbit grows." : p.streak > 0 ? "Today already counts." : "Finish a phrase to start your orbit."}</span>
        </section>
      )}

      {missions.length > 0 && (
        <section className="end-card">
          <h2 className="end-sub muted">🎯 Missions</h2>
          {missions.map(({ q, before, after }) => (
            <div key={q.id} className="end-mission">
              <div className="quest-card-head">
                <span>{q.name}</span>
                <span className="muted">
                  {after >= q.target ? "✅ " : ""}
                  {after}/{q.target}
                </span>
              </div>
              <div className="xpbar quest-bar end-mission-bar" style={{ "--from": `${Math.round((before / q.target) * 100)}%` } as React.CSSProperties}>
                <span style={{ width: `${Math.round((after / q.target) * 100)}%` }} />
              </div>
            </div>
          ))}
        </section>
      )}

      {p.gains.badges.length > 0 && (
        <section className="end-card">
          <h2 className="end-sub muted">New badges</h2>
          <div className="end-badges">
            {p.gains.badges.map((id) => {
              const b = BADGE_BY_ID.get(id)!;
              return (
                <span key={id} className="end-badge" title={b.description}>
                  <span aria-hidden>{b.icon}</span> {b.name}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <div className="stats">
        <div>
          <b>{p.score}</b>
          <span>{newBest ? "🏆 New personal best!" : p.prevBest ? `Score · best ${p.prevBest}` : "Score"}</span>
        </div>
        <div>
          <b>{p.solved.value}</b>
          <span>{p.solved.label}</span>
        </div>
        <div>
          <b>{p.time}</b>
          <span>Practice time</span>
        </div>
      </div>

      {p.missed.length > 0 ? (
        <p className="muted">
          To revisit: <span className="missed">{p.missed.join(", ")}</span>
        </p>
      ) : (
        <p className="muted">No slips this time. Your fingers can take it from here.</p>
      )}

      <div className="end-actions">
        <button type="button" className="check big" onClick={p.onContinue} autoFocus>
          Continue
        </button>
        <button type="button" className="check big ghost" onClick={p.onPlayAgain}>
          ↺ Play again
        </button>
      </div>
    </main>
  );
}
