"use client";

import type { CSSProperties } from "react";
import type { CelestialBody } from "@/lib/bodies";
import type { Planet } from "@/lib/planets";
import { periodKeyFor, QUESTS } from "@/lib/quests";
import { progressFor, type QuestProgress } from "@/lib/questStore";
import { ClaimButton, type OnClaim } from "./ClaimButton";
import { ArrowRight, Check, Compass, Play, Store, Target } from "./icons";

type Props = {
  /** The journey stop you're on. */
  stop: CelestialBody;
  /** What "Continue" plays, or null while that stop has no phrases yet. */
  planet: Planet | null;
  quests: QuestProgress[];
  onClaim: OnClaim;
  onContinue: () => void;
  onFreeMode: () => void;
  onMissions: () => void;
  onShop: () => void;
};

/** Today's three missions as bars: on the home page (the rail on wide screens, inline on phones). */
export function DailyMissions({ quests, onClaim, onAll, className = "" }: { quests: QuestProgress[]; onClaim: OnClaim; onAll: () => void; className?: string }) {
  const now = new Date();
  return (
    <section className={`side-card daily-missions ${className}`}>
      <div className="side-card-head">
        <b>Today&apos;s missions</b>
        <button type="button" className="link small icon-text" onClick={onAll}>
          All <ArrowRight />
        </button>
      </div>
      {QUESTS.filter((q) => q.period === "daily").map((q) => {
        const row = progressFor(quests, q.id, periodKeyFor(q, now));
        const done = row.count >= q.target;
        return (
          <div key={q.id} className={`rail-mission ${done ? "done" : ""}`}>
            <div className="quest-card-head">
              <span>{q.name}</span>
              <span className="muted">{done ? <Check label="Done" className="done-check" /> : `${row.count}/${q.target}`}</span>
            </div>
            {done ? (
              <ClaimButton def={q} periodKey={row.periodKey} claimed={row.claimed} onClaim={onClaim} quiet />
            ) : (
              <div className="xpbar quest-bar">
                <span style={{ width: `${Math.min(100, Math.round((row.count / q.target) * 100))}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** Desktop home, right rail: the next thing to do, today's missions, and the other ways in. */
export function MissionRail({ stop, planet, quests, onClaim, onContinue, onFreeMode, onMissions, onShop }: Props) {
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
            <span className="muted icon-text">
              <Play /> Continue on
            </span>
            <b className="icon-text">
              {planet.name} <ArrowRight />
            </b>
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

      <DailyMissions quests={quests} onClaim={onClaim} onAll={onMissions} />

      <nav className="side-links">
        <button type="button" className="profile-link" onClick={onFreeMode}>
          <span className="icon-text">
            <Compass /> Free mode
          </span>
          <ArrowRight className="muted" />
        </button>
        <button type="button" className="profile-link" onClick={onMissions}>
          <span className="icon-text">
            <Target /> Missions
          </span>
          <ArrowRight className="muted" />
        </button>
        <button type="button" className="profile-link" onClick={onShop}>
          <span className="icon-text">
            <Store /> Store
          </span>
          <ArrowRight className="muted" />
        </button>
      </nav>
    </>
  );
}
