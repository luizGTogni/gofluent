"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CELESTIAL_PATH } from "@/lib/bodies";
import { journeyIndex, stopDone, type PhraseCounts, type PlanetStat } from "@/lib/planetStats";
import { PLANET_BY_ID, type PlanetId } from "@/lib/planets";
import { StopGoal } from "./StopGoal";
import { Check, Lock, Rocket } from "./icons";

type Props = {
  stats: Map<PlanetId, PlanetStat>;
  counts: PhraseCounts;
  current: PlanetId;
  onSelect: (id: PlanetId) => void;
};

// Side-to-side steps for the winding trail, repeating every 4 stops so it drifts left-right-left
// as it goes down rather than sitting in a straight line — a gentle rocket path, not a switchback.
const STEPS = [0, 1, 2, 1];

const DESKTOP = "(min-width: 1024px)";

/** A smooth curve through the centers of the path's nodes, relative to the path box. */
function trailThrough(path: HTMLElement): string {
  const box = path.getBoundingClientRect();
  const pts = [...path.querySelectorAll<HTMLElement>(".planet-node")].map((n) => {
    const r = n.getBoundingClientRect();
    return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
  });
  return pts
    .map(([x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [px, py] = pts[i - 1];
      const my = (py + y) / 2;
      return `C${px},${my} ${x},${my} ${x},${y}`;
    })
    .join(" ");
}

/**
 * The main mission: every astro in real solar-system order (the invented planets at the end), one
 * stop after another. A stop opens once the one before it is finished; a locked stop shows what
 * that takes. A stop without phrases yet is "coming soon", and the journey waits there until they
 * arrive. Tapping a locked or empty stop opens a popover. A rocket marks where you are.
 */
export function Courses({ stats, counts, current, onSelect }: Props) {
  const pathRef = useRef<HTMLDivElement>(null);
  const [trail, setTrail] = useState("");
  // The stop whose popover is open (a locked stop's goal, or a coming-soon stop's trivia).
  const [open, setOpen] = useState<string | null>(null);

  // Wide screens swing the path much further side to side, so the straight guide line gives way to
  // a curve drawn through the nodes themselves, redrawn whenever the path resizes.
  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const draw = () => setTrail(window.matchMedia(DESKTOP).matches ? trailThrough(el) : "");
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Open the journey where the rocket is: centered on wide screens; on phones only as far as
  // needed, so the actions above the path stay in view when they can.
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP).matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pathRef.current
      ?.querySelector(".planet-rocket")
      ?.parentElement?.scrollIntoView({ block: desktop ? "center" : "nearest", behavior: reduce ? "auto" : "smooth" });
  }, []);

  // A popover closes on Escape or a tap anywhere outside its stop.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(`[data-stop="${open}"]`)) setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  // The stop you're on; the rocket sits there, or on the open planet you picked.
  const here = journeyIndex(stats, counts);
  const picked = CELESTIAL_PATH.findIndex((b) => b.planetId === current);
  const rocketAt = picked >= 0 && picked <= here && (counts[current] ?? 0) > 0 ? picked : here;

  return (
    <div className="courses">
      <div className="planet-path" ref={pathRef}>
        {trail && (
          <svg className="planet-trail" aria-hidden>
            <path d={trail} />
          </svg>
        )}
        {CELESTIAL_PATH.map((body, i) => {
          const style = { "--step": STEPS[i % STEPS.length] } as CSSProperties;
          const popId = `stop-pop-${body.id}`;
          const isOpen = open === body.id;
          const planet = body.planetId ? PLANET_BY_ID.get(body.planetId) : undefined;
          const count = planet ? (counts[planet.id] ?? 0) : 0;
          const stat = planet ? stats.get(planet.id) : undefined;
          const color = planet?.color ?? body.color;
          const ring = planet?.ring ?? body.ring;
          const unlocked = i <= here;
          const playable = unlocked && count > 0;
          const done = unlocked && stopDone(stat, count);
          const prev = CELESTIAL_PATH[i - 1];
          const prevPlanet = prev?.planetId;
          const prevGoal = prev && (
            <StopGoal name={prev.name} stat={prevPlanet ? stats.get(prevPlanet) : undefined} count={prevPlanet ? (counts[prevPlanet] ?? 0) : 0} />
          );
          const state = playable ? (done ? "finished" : "open") : unlocked ? "phrases coming soon" : `locked, finish ${prev?.name} first`;
          return (
            <div key={body.id} className="planet-path-row" style={style} data-stop={body.id}>
              {i === rocketAt && (
                <span className="planet-rocket" aria-hidden>
                  <Rocket />
                </span>
              )}
              <button
                type="button"
                className={`planet-node ${i === rocketAt ? "on" : ""} ${unlocked ? "" : "locked"} ${count === 0 ? "soon" : ""}`}
                style={color ? ({ "--orb-hi": color[0], "--orb-lo": color[1] } as CSSProperties) : undefined}
                aria-pressed={playable ? i === rocketAt : undefined}
                aria-expanded={playable ? undefined : isOpen}
                aria-controls={playable ? undefined : popId}
                aria-label={`${body.name}, ${state}`}
                onClick={() => (playable ? onSelect(planet!.id) : toggle(body.id))}
              >
                <span className={`planet-orb ${ring ? "ringed" : ""}`} aria-hidden />
                {!unlocked && (
                  <span className="planet-node-lock" aria-hidden>
                    <Lock />
                  </span>
                )}
                {done && (
                  <span className="planet-node-lock planet-node-done" aria-hidden>
                    <Check />
                  </span>
                )}
                {unlocked && count === 0 && (
                  <span className="planet-node-soon" aria-hidden>
                    Soon
                  </span>
                )}
              </button>
              <span className="planet-node-name">{body.name}</span>
              {playable && !done && <StopGoal name={body.name} stat={stat} count={count} own />}
              {i === here + 1 && prevGoal}
              {isOpen && (
                <div id={popId} className="stop-pop" role="dialog" aria-label={body.name}>
                  <b>
                    {body.name} {planet ? <span className="chip-cefr small">{planet.cefr}</span> : <span className="muted">· {body.pt}</span>}
                  </b>
                  <span className="muted">{planet ? planet.topic : body.fame}</span>
                  {unlocked ? (
                    <span className="stop-pop-note">Phrases for this stop are coming soon. Your journey continues from here once they arrive.</span>
                  ) : (
                    prevGoal
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
