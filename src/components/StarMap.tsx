"use client";

import { canEnter, cefrBands, cefrEstimate, MIN_SAMPLE, PASS_RATE, type PlanetStat } from "@/lib/planetStats";
import { PLANETS, type PlanetId } from "@/lib/planets";
import { TITLES, type Rank } from "@/lib/ranks";

type Props = {
  rank: Rank;
  stats: Map<PlanetId, PlanetStat>;
  counts: Record<PlanetId, number>;
  current: PlanetId;
  onSelect: (id: PlanetId) => void;
  onBack: () => void;
};

export function StarMap({ rank, stats, counts, current, onSelect, onBack }: Props) {
  const bands = cefrBands(stats.values());
  const estimate = cefrEstimate(bands);

  return (
    <main className="shell center map">
      <h1 className="hero">Star map</h1>

      <div className="cefr-card">
        <div className="cefr-head">
          <span className="muted">Estimated English level</span>
          <b className="cefr-level">{estimate ?? "Not enough data yet"}</b>
        </div>
        <div className="cefr-bands">
          {bands.map((b) => (
            <div key={b.cefr} className={`cefr-band ${b.passed ? "passed" : ""}`} title={`${b.solid} of ${b.played} phrases solid`}>
              <b>{b.cefr}</b>
              <span>{b.enough ? `${Math.round(b.rate * 100)}%` : `${b.played}/${MIN_SAMPLE}`}</span>
            </div>
          ))}
        </div>
        <p className="muted cefr-note">
          Based on how cleanly you finish phrases: at least {MIN_SAMPLE} per level, and {Math.round(PASS_RATE * 100)}% without hints or more than one slip.
        </p>
      </div>

      <ul className="planets">
        {PLANETS.map((p) => {
          const count = counts[p.id] ?? 0;
          const stat = stats.get(p.id);
          const open = canEnter(p, rank, stat);
          const soon = count === 0;
          const disabled = soon || !open;
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`planet ${current === p.id ? "on" : ""} ${disabled ? "locked" : ""}`}
                disabled={disabled}
                onClick={() => onSelect(p.id)}
              >
                <span className="planet-emoji" aria-hidden>
                  {p.emoji}
                </span>
                <span className="planet-main">
                  <b>
                    {p.name} <span className="muted">· {p.pt}</span>
                  </b>
                  <span className="muted">{p.topic}</span>
                  <span className="planet-meta">
                    {soon
                      ? "Coming soon"
                      : !open
                        ? `🔒 Reach ${TITLES[p.minRank].name} to visit`
                        : stat?.played
                          ? `${stat.played} played · ${stat.solid} solid`
                          : `${count} phrases`}
                  </span>
                </span>
                <span className="chip-cefr">{p.cefr}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <button type="button" className="check" onClick={onBack}>
        ← Back
      </button>
    </main>
  );
}
