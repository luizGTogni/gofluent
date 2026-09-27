"use client";

import { canEnter, type PlanetStat } from "@/lib/planetStats";
import { PLANETS, type PlanetId } from "@/lib/planets";
import type { Rank } from "@/lib/ranks";
import { TITLES } from "@/lib/titles";

type Props = {
  rank: Rank;
  stats: Map<PlanetId, PlanetStat>;
  counts: Record<PlanetId, number>;
  current: PlanetId;
  onSelect: (id: PlanetId) => void;
  onSeeAll: () => void;
};

/** A shelf of courses (planets): a few in reach, the rest visibly locked by rank or not built yet. */
export function Courses({ rank, stats, counts, current, onSelect, onSeeAll }: Props) {
  return (
    <div className="courses">
      <div className="courses-head">
        <span className="muted">Courses</span>
        <button type="button" className="link small" onClick={onSeeAll}>
          See all →
        </button>
      </div>
      <div className="courses-row">
        {PLANETS.map((p) => {
          const count = counts[p.id] ?? 0;
          const stat = stats.get(p.id);
          const open = canEnter(p, rank, stat) && count > 0;
          return (
            <button
              key={p.id}
              type="button"
              className={`course-card ${current === p.id ? "on" : ""} ${!open ? "locked" : ""}`}
              disabled={!open}
              title={count === 0 ? "Coming soon" : !open ? `Reach ${TITLES[p.minRank].name} to unlock` : p.topic}
              onClick={() => onSelect(p.id)}
            >
              <span className="course-emoji" aria-hidden>
                {open ? p.emoji : "🔒"}
              </span>
              <span className="course-name">{p.name}</span>
              <span className="chip-cefr small">{p.cefr}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
