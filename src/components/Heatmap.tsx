"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { gridWeeks, historyDays, intensity, longDate, monthLabels, shortDate, WEEKDAYS, type DayVolume } from "@/lib/heatmap";
import { plural } from "@/lib/format";

type Props = {
  checked: ReadonlySet<string>;
  frozen: ReadonlySet<string>;
  volume: ReadonlyMap<string, DayVolume>;
  today: string;
};

// Cell geometry, mirrored in globals.css (.orbit-history: --cell, --gap, --label).
const GAP = 3;
const LABEL = 28;
const cellSize = () => (window.matchMedia("(min-width: 1024px)").matches ? 14 : 12);
/** How many weeks a width can hold, capped by breakpoint: ~17 on phones, 26 from 1024px, 52 from 1440px. */
function weeksFor(width: number): number {
  const max = window.matchMedia("(min-width: 1440px)").matches ? 52 : window.matchMedia("(min-width: 1024px)").matches ? 26 : 17;
  return Math.max(4, Math.min(max, Math.floor((width - LABEL + GAP) / (cellSize() + GAP))));
}

type DayState = { day: string; future: boolean; studied: boolean; shield: boolean; level: number; v?: DayVolume };

/** What the day detail and the cell's accessible name say. */
function describe(s: DayState, today: string): { title: string; lines: string[]; label: string } {
  const lines: string[] = [];
  if (s.future) lines.push("Upcoming");
  else if (s.studied) {
    lines.push(s.v?.phrases ? `${plural(s.v.phrases, "phrase")} · ${s.v.xp} XP` : "Studied");
  } else if (!s.shield) lines.push(s.day === today ? "Not yet today" : "No study");
  if (s.shield) lines.push("Covered by a Streak Shield");
  return { title: longDate(s.day), lines, label: `${shortDate(s.day)}, ${lines.join(", ")}` };
}

/**
 * GitHub-style orbit calendar on the learner's clock: weeks as columns (Monday first), the last
 * one holding today; intensity by phrases per day; shielded days hatched. Arrow keys move between
 * days when the grid has focus; hovering, tapping or focusing a day shows its details.
 */
export function Heatmap({ checked, frozen, volume, today }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [weeks, setWeeks] = useState(17);
  const [focus, setFocus] = useState<{ w: number; d: number } | null>(null);
  const [pop, setPop] = useState<{ day: string; x: number; y: number; below: boolean } | null>(null);
  const cellRefs = useRef(new Map<string, HTMLElement>());

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setWeeks(weeksFor(el.clientWidth));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = gridWeeks(today, weeks);
  const months = monthLabels(cols);
  const state = (day: string): DayState => {
    const studied = checked.has(day);
    return { day, future: day > today, studied, shield: frozen.has(day), level: intensity(studied, volume.get(day)), v: volume.get(day) };
  };
  // The roving tab stop: the focused day, or today.
  const todayPos = { w: weeks - 1, d: cols[weeks - 1].indexOf(today) };
  const active = focus && focus.w < weeks ? focus : todayPos;

  const show = (day: string) => {
    const cell = cellRefs.current.get(day);
    const wrap = wrapRef.current;
    if (!cell || !wrap) return;
    const c = cell.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    const x = Math.min(Math.max(c.left + c.width / 2 - b.left, 100), b.width - 100);
    const below = c.top - b.top < 70;
    setPop({ day, x, y: below ? c.bottom - b.top + 6 : c.top - b.top - 6, below });
  };

  // Tapping outside the grid closes the day detail.
  useEffect(() => {
    if (!pop) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !wrapRef.current?.contains(e.target)) setPop(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [pop]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (e.key === "Escape") return setPop(null);
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    const w = Math.min(weeks - 1, Math.max(0, active.w + m[0]));
    const d = Math.min(6, Math.max(0, active.d + m[1]));
    setFocus({ w, d });
    const day = cols[w][d];
    cellRefs.current.get(day)?.focus();
  };

  const studiedCount = cols.flat().filter((d) => checked.has(d)).length;
  const popInfo = pop ? describe(state(pop.day), today) : null;

  return (
    <div ref={wrapRef} className="heatmap" style={{ "--weeks": weeks } as CSSProperties}>
      <div className="heatmap-months" aria-hidden>
        <span />
        {months.map((m, w) => (
          <span key={w}>{m}</span>
        ))}
      </div>
      <div
        role="grid"
        className="heatmap-grid"
        aria-label={`Orbit calendar, last ${weeks} weeks: ${plural(studiedCount, "day")} studied. Use the arrow keys to move between days.`}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setPop(null)}
      >
        {WEEKDAYS.map((name, d) => (
          <div key={d} role="row" className="heatmap-row">
            <span className="heatmap-daylabel" aria-hidden>
              {d % 2 === 0 && d < 5 ? name : ""}
            </span>
            {cols.map((week, w) => {
              const s = state(week[d]);
              const isActive = active.w === w && active.d === d;
              return (
                <span
                  key={s.day}
                  ref={(el) => {
                    if (el) cellRefs.current.set(s.day, el);
                    else cellRefs.current.delete(s.day);
                  }}
                  role="gridcell"
                  tabIndex={isActive ? 0 : -1}
                  aria-label={describe(s, today).label}
                  className={[
                    "heatmap-cell",
                    `l${s.level}`,
                    s.future ? "future" : "",
                    s.shield ? "shield" : "",
                    s.day === today ? `today ${s.studied ? "" : "pending"}` : "",
                  ].join(" ")}
                  onMouseEnter={() => show(s.day)}
                  onFocus={() => {
                    setFocus({ w, d });
                    show(s.day);
                  }}
                  onClick={() => (pop?.day === s.day ? setPop(null) : show(s.day))}
                />
              );
            })}
          </div>
        ))}
      </div>
      {pop && popInfo && (
        <div className={`heatmap-pop ${pop.below ? "below" : ""}`} style={{ left: pop.x, top: pop.y }} aria-hidden>
          <b>{popInfo.title}</b>
          {popInfo.lines.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The full calendar only earns its space once there are two weeks of history. */
const HISTORY_FROM_DAYS = 14;

/** The orbit calendar as its own card, under the orbit card; nothing until two weeks of history. */
export function OrbitHistory(props: Props) {
  if (historyDays(props.checked, props.frozen, props.today) < HISTORY_FROM_DAYS) return null;
  return (
    <section className="profile-card orbit-history" aria-label="Orbit history">
      <div className="profile-card-head">
        <b>Orbit history</b>
      </div>
      <Heatmap {...props} />
      <div className="heatmap-legend" aria-hidden>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heatmap-cell l${l}`} />
        ))}
        <span>More</span>
        <span className="legend-sep">·</span>
        <span className="heatmap-cell shield" />
        <span>Shield</span>
      </div>
    </section>
  );
}
