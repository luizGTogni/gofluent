"use client";

import type { CSSProperties } from "react";
import type { Planet } from "@/lib/planets";
import { periodKeyFor, QUESTS } from "@/lib/quests";
import { progressFor, type QuestProgress } from "@/lib/questStore";

type Props = {
  planet: Planet;
  quests: QuestProgress[];
  onContinue: () => void;
  onFreeMode: () => void;
  onMissions: () => void;
  onShop: () => void;
};

/** Desktop home, right rail: the next thing to do, today's missions, and the other ways in. */
export function MissionRail({ planet, quests, onContinue, onFreeMode, onMissions, onShop }: Props) {
  const now = new Date();
  const daily = QUESTS.filter((q) => q.period === "daily");

  return (
    <>
      <button
        type="button"
        className="side-card continue-card"
        onClick={onContinue}
        style={{ "--orb-hi": planet.color[0], "--orb-lo": planet.color[1] } as CSSProperties}
      >
        <span className={`planet-orb ${planet.ring ? "ringed" : ""}`} aria-hidden />
        <span className="continue-text">
          <span className="muted">Continue on</span>
          <b>{planet.name} →</b>
          <span className="muted continue-topic">
            {planet.topic} · {planet.cefr}
          </span>
        </span>
      </button>

      <section className="side-card">
        <div className="side-card-head">
          <b>🎯 Today&apos;s missions</b>
          <button type="button" className="link small" onClick={onMissions}>
            All →
          </button>
        </div>
        {daily.map((q) => {
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

      <nav className="side-links">
        <button type="button" className="profile-link" onClick={onFreeMode}>
          <span>🚀 Free mode</span>
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
