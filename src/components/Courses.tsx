"use client";

import type { CSSProperties } from "react";
import { CELESTIAL_PATH } from "@/lib/bodies";
import { canEnter, type PlanetStat } from "@/lib/planetStats";
import { PLANET_BY_ID, type PlanetId } from "@/lib/planets";
import type { Rank } from "@/lib/ranks";
import { TITLES } from "@/lib/titles";

type Props = {
  rank: Rank;
  stats: Map<PlanetId, PlanetStat>;
  counts: Record<PlanetId, number>;
  current: PlanetId;
  onSelect: (id: PlanetId) => void;
};

// Side-to-side steps for the winding trail, repeating every 4 stops so it drifts left-right-left
// as it goes down rather than sitting in a straight line — a gentle rocket path, not a switchback.
const STEPS = [0, 1, 2, 1];

/** The full journey, real solar system order first: a rocket marks where you are, playable
 * planets are open or locked by rank, and every other stop is scenery for now — a waypoint with
 * no course behind it yet (most past Saturn don't even have an orb design drawn yet). */
export function Courses({ rank, stats, counts, current, onSelect }: Props) {
  return (
    <div className="courses">
      <div className="planet-path">
        {CELESTIAL_PATH.map((body, i) => {
          const planet = body.planetId ? PLANET_BY_ID.get(body.planetId) : undefined;
          const count = planet ? (counts[planet.id] ?? 0) : 0;
          const stat = planet ? stats.get(planet.id) : undefined;
          const open = planet ? canEnter(planet, rank, stat) && count > 0 : false;
          const isCurrent = planet ? current === planet.id : false;
          const style = { "--step": STEPS[i % STEPS.length] } as CSSProperties;
          const title = !planet
            ? body.fame
            : count === 0
              ? "Coming soon"
              : !open
                ? `Reach ${TITLES[planet.minRank].name} to unlock`
                : planet.topic;
          return (
            <div key={body.id} className="planet-path-row" style={style}>
              {isCurrent && (
                <span className="planet-rocket" aria-hidden>
                  🚀
                </span>
              )}
              <button
                type="button"
                className={`planet-node ${isCurrent ? "on" : ""} ${!open ? "locked" : ""} ${body.color ? "" : "unmapped"}`}
                disabled={!planet || !open}
                title={title}
                onClick={() => planet && onSelect(planet.id)}
                style={body.color ? ({ "--orb-hi": body.color[0], "--orb-lo": body.color[1] } as CSSProperties) : undefined}
              >
                {body.color ? (
                  <span className={`planet-orb ${body.ring ? "ringed" : ""}`} aria-hidden />
                ) : (
                  <span className="planet-orb-blank" aria-hidden />
                )}
                {!open && (
                  <span className="planet-node-lock" aria-hidden>
                    🔒
                  </span>
                )}
              </button>
              <span className="planet-node-name">{body.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
