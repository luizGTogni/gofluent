"use client";

import type { CSSProperties } from "react";
import type { CelestialBody } from "@/lib/bodies";
import type { Planet } from "@/lib/planets";
import { periodKeyFor, QUESTS } from "@/lib/quests";
import { progressFor, type QuestProgress } from "@/lib/questStore";

type Props = {
  /** The journey stop you're on. */
  stop: CelestialBody;
  /** What "Continue" plays, or null while that stop has no phrases yet. */
  planet: Planet | null;
  quests: QuestProgress[];
  onContinue: () => void;
  onFreeMode: () => void;
  onMissions: () => void;
  onShop: () => void;
};

/** Today's three missions as bars: on the home page (the rail on wide screens, inline on phones). */
export function DailyMissions({ quests, onAll, className = "" }: { quests: QuestProgress[]; onAll: () => void; className?: string }) {
  const now = new Date();
  return (
    <section className={`side-card daily-missions ${className}`}>
      <div className="side-card-head">
        <b>🎯 Today&apos;s missions</b>
        <button type="button" className="link small" onClick={onAll}>
          All →
        </button>
      </div>
      {QUESTS.filter((q) => q.period === "daily").map((q) => {
        const row = progressFor(quests, q.id, periodKeyFor(q, now));
        const done = row.count >= q.target;
        return (
          <div key={q.id} className={`rail-mission ${done ? "done" : ""}`}>
            <div className="quest-card-head">
              <span>{q.name}</span>
              <span className="muted">{done ? "✅" : `${row.count}/${q.target}`}</span>
            </div>
            <div className="xpbar quest-bar">
              <span style={{ width: `${Math.min(100, Math.round((row.count / q.target) * 100))}%` }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** Desktop home, right rail: the next thing to do, today's missions, and the other ways in. */
export function MissionRail({ stop, planet, quests, onContinue, onFreeMode, onMissions, onShop }: Props) {
  const color = planet?.color ?? stop.color;
  return (
    <>
      <button
        type="button"
        className="side-card continue-card"
        onClick={onContinue}
        disabled={!planet}
        style={color ? ({ "--orb-hi": color[0], "--orb-lo": color[1] } as CSSProperties) : undefined}
      >
        <span className={`planet-orb ${(planet?.ring ?? stop.ring) ? "ringed" : ""}`} aria-hidden />
        {planet ? (
          <span className="continue-text">
            <span className="muted">▶ Continue on</span>
            <b>{planet.name} →</b>
            <span className="muted continue-topic">
              {planet.topic} · {planet.cefr}
            </span>
          </span>
        ) : (
          <span className="continue-text">
            <span className="muted">You&apos;re at</span>
            <b>{stop.name}</b>
            <span className="muted continue-topic">Phrases for this stop are coming soon.</span>
          </span>
        )}
      </button>

      <DailyMissions quests={quests} onAll={onMissions} />

      <nav className="side-links">
        <button type="button" className="profile-link" onClick={onFreeMode}>
          <span>🚀 Free mode</span>
          <span className="muted">→</span>
        </button>
        <button type="button" className="profile-link" onClick={onMissions}>
          <span>🎯 Missions</span>
          <span className="muted">→</span>
        </button>
        <button type="button" className="profile-link" onClick={onShop}>
          <span>🛒 Store</span>
          <span className="muted">→</span>
        </button>
      </nav>
    </>
  );
}
