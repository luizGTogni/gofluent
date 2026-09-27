"use client";

import type { CSSProperties } from "react";
import { canEnter, previousStop, type PlanetStat } from "@/lib/planetStats";
import { PLANET_BY_ID, type PlanetId } from "@/lib/planets";
import { CELESTIAL_PATH } from "@/lib/bodies";
import { plural } from "@/lib/format";
import { MODES, type GameMode } from "@/lib/modes";
import { MODE_UNLOCKS, modeUnlocked } from "@/lib/unlocks";
import { RankGoal } from "./RankGoal";
import type { Rank } from "@/lib/ranks";

type Props = {
  mode: GameMode;
  onSelectMode: (m: GameMode) => void;
  planetId: PlanetId;
  onSelectPlanet: (id: PlanetId) => void;
  rank: Rank;
  /** Rank points right now, for how far a locked mode is. */
  rp: number;
  /** False while the journey stop you're on has no phrases: nothing to play yet. */
  canStart: boolean;
  stuckAt: string;
  stats: Map<PlanetId, PlanetStat>;
  counts: Record<PlanetId, number>;
  onStart: () => void;
  onBack: () => void;
};

// Same order as the journey (Courses.tsx): nearest to the Sun first, the invented planets last.
const PATH_PLANETS = CELESTIAL_PATH.flatMap((b) => (b.planetId ? [PLANET_BY_ID.get(b.planetId)!] : []));

/** Wide screens: what the picked planet is about and how it's going for you so far. */
function PlanetPreview({ planetId, stat, count }: { planetId: PlanetId; stat?: PlanetStat; count: number }) {
  const p = PLANET_BY_ID.get(planetId)!;
  const played = stat?.played ?? 0;
  const solidPct = played ? Math.round(((stat?.solid ?? 0) / played) * 100) : 0;
  return (
    <section className="side-card planet-preview" style={{ "--orb-hi": p.color[0], "--orb-lo": p.color[1] } as CSSProperties}>
      <span className={`planet-orb ${p.ring ? "ringed" : ""}`} aria-hidden />
      <div className="planet-preview-text">
        <div className="side-card-head">
          <b>{p.name}</b>
          <span className="chip-cefr">{p.cefr}</span>
        </div>
        <span className="muted">{p.topic}</span>
        <span className="muted planet-preview-stat">
          {plural(count, "phrase")} · {played ? `${plural(played, "run")}, ${solidPct}% solid` : "Not visited yet"}
        </span>
        <div className="xpbar quest-bar" aria-label={`${solidPct}% solid`}>
          <span style={{ width: `${solidPct}%` }} />
        </div>
      </div>
    </section>
  );
}

/** "Free mode": pick how to play, then pick a planet, then go. */
export function ModePicker({ mode, onSelectMode, planetId, onSelectPlanet, rank, rp, canStart, stuckAt, stats, counts, onStart, onBack }: Props) {
  return (
    <main className="shell center mode-picker">
      <button type="button" className="link mode-picker-back" onClick={onBack}>
        ← Back
      </button>
      <h1 className="hero">Free mode</h1>
      <p className="muted">Pick how you want to play, then pick a planet.</p>

      <div className="mode-layout">
      <section className="mode-grid">
        {MODES.map((m) => {
          const unlocked = modeUnlocked(m.id, rank.index);
          return (
            <button
              key={m.id}
              type="button"
              className={`mode-card ${mode === m.id ? "on" : ""} ${unlocked ? "" : "locked"}`}
              aria-pressed={mode === m.id}
              disabled={!unlocked}
              onClick={() => onSelectMode(m.id)}
            >
              <span className="mode-icon" aria-hidden>
                {m.icon}
              </span>
              <b>{m.name}</b>
              <span className="muted">{m.blurb}</span>
              {!unlocked && <RankGoal rp={rp} index={MODE_UNLOCKS[m.id]} />}
            </button>
          );
        })}
      </section>

      <div className="mode-right">
      <h2 className="mode-picker-sub muted">Choose a planet</h2>
      <div className="mode-planets">
        {PATH_PLANETS.map((p) => {
          const count = counts[p.id] ?? 0;
          const open = canEnter(p, stats, counts) && count > 0;
          const prev = previousStop(p);
          const style = { "--orb-hi": p.color[0], "--orb-lo": p.color[1] } as CSSProperties;
          // Same node as the journey (Courses.tsx): the orb is the button, the name sits below.
          return (
            <div key={p.id} className="mode-planet">
              <button
                type="button"
                className={`planet-node ${open && planetId === p.id ? "on" : ""} ${!open ? "locked" : ""}`}
                disabled={!open}
                aria-pressed={open && planetId === p.id}
                aria-label={p.name}
                title={count === 0 ? "Coming soon" : !open && prev ? `Finish ${prev.name} to unlock` : p.topic}
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

      {canStart ? (
        <PlanetPreview planetId={planetId} stat={stats.get(planetId)} count={counts[planetId] ?? 0} />
      ) : (
        <p className="muted">You&apos;re at {stuckAt} on your journey. Its phrases are coming soon, and the next stops open after it.</p>
      )}

      <button type="button" className="check big mode-start" disabled={!canStart} onClick={onStart}>
        Start →
      </button>
      </div>
      </div>
    </main>
  );
}
