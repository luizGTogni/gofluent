"use client";

import type { CSSProperties } from "react";
import { canEnter, type PlanetStat } from "@/lib/planetStats";
import { PLANETS, type PlanetId } from "@/lib/planets";
import { MODES, type GameMode } from "@/lib/modes";
import type { Rank } from "@/lib/ranks";
import { TITLES } from "@/lib/titles";

type Props = {
  mode: GameMode;
  onSelectMode: (m: GameMode) => void;
  planetId: PlanetId;
  onSelectPlanet: (id: PlanetId) => void;
  rank: Rank;
  stats: Map<PlanetId, PlanetStat>;
  counts: Record<PlanetId, number>;
  onStart: () => void;
  onBack: () => void;
};

/** "Free mode": pick how to play, then pick a planet, then go. */
export function ModePicker({ mode, onSelectMode, planetId, onSelectPlanet, rank, stats, counts, onStart, onBack }: Props) {
  return (
    <main className="shell center mode-picker">
      <button type="button" className="link mode-picker-back" onClick={onBack}>
        ← Back
      </button>
      <h1 className="hero">Free mode</h1>
      <p className="muted">Pick how you want to play, then pick a planet.</p>

      <section className="mode-grid">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mode-card ${mode === m.id ? "on" : ""}`}
            aria-pressed={mode === m.id}
            onClick={() => onSelectMode(m.id)}
          >
            <span className="mode-icon" aria-hidden>
              {m.icon}
            </span>
            <b>{m.name}</b>
            <span className="muted">{m.blurb}</span>
          </button>
        ))}
      </section>

      <h2 className="mode-picker-sub muted">Choose a planet</h2>
      <div className="mode-planets">
        {PLANETS.map((p) => {
          const count = counts[p.id] ?? 0;
          const stat = stats.get(p.id);
          const open = canEnter(p, rank, stat) && count > 0;
          const style = { "--orb-hi": p.color[0], "--orb-lo": p.color[1] } as CSSProperties;
          // Same node as the journey (Courses.tsx): the orb is the button, the name sits below.
          return (
            <div key={p.id} className="mode-planet">
              <button
                type="button"
                className={`planet-node ${planetId === p.id ? "on" : ""} ${!open ? "locked" : ""}`}
                disabled={!open}
                aria-pressed={planetId === p.id}
                aria-label={p.name}
                title={count === 0 ? "Coming soon" : !open ? `Reach ${TITLES[p.minRank].name} to unlock` : p.topic}
                onClick={() => onSelectPlanet(p.id)}
                style={style}
              >
                <span className={`planet-orb ${p.ring ? "ringed" : ""}`} aria-hidden />
                {!open && (
                  <span className="planet-node-lock" aria-hidden>
                    🔒
                  </span>
                )}
              </button>
              <span className="planet-node-name">{p.name}</span>
            </div>
          );
        })}
      </div>

      <button type="button" className="check big" onClick={onStart}>
        Start →
      </button>
    </main>
  );
}
