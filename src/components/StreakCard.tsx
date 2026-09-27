"use client";

import type { StudyCalendar } from "@/lib/economyStore";
import { plural } from "@/lib/format";
import { currentWeek, historyDays, nextMilestone, orbitSummary } from "@/lib/heatmap";
import { currencyLine } from "@/lib/rewards";
import { computeStreak } from "@/lib/streak";
import { Heatmap, WeekStrip } from "./Heatmap";

type Props = {
  calendar: StudyCalendar;
  today: string;
  shields: number;
  /** Starts a session right away; false while there's nothing to play. */
  canStudy: boolean;
  onStudy: () => void;
  onShop: () => void;
};

/** Full calendar once the orbit has two weeks of history; before that, just this week. */
const GRID_FROM_DAYS = 14;

/**
 * The profile's orbit card: the streak and the next milestone's reward up top, today's status
 * with a way to secure it, then the calendar, a legend and a short summary.
 */
export function StreakCard({ calendar, today, shields, canStudy, onStudy, onShop }: Props) {
  const { checked, frozen, volume } = calendar;
  const streak = computeStreak(checked, frozen, today);
  const next = nextMilestone(streak.current);
  const secured = checked.has(today);
  const summary = orbitSummary(checked, volume, today);
  const showGrid = historyDays(checked, frozen, today) >= GRID_FROM_DAYS;

  return (
    <section
      className="profile-card streak-card"
      aria-label={`Orbit: ${plural(streak.current, "day")} in a row, best ${plural(streak.longest, "day")}. ${secured ? "Today is secured." : "Not studied yet today."}`}
    >
      <div className="streak-head">
        <span className="streak-now">
          <span aria-hidden>🛰️</span> <b>{streak.current}</b> {streak.current === 1 ? "day" : "days"}
        </span>
        <span className="muted streak-best">Best: {plural(streak.longest, "day")}</span>
      </div>

      {next ? (
        <div className="streak-next">
          <div className="xpbar">
            <span style={{ width: `${next.pct}%` }} />
          </div>
          <span className="muted">
            {plural(next.left, "day")} to the {next.target}-day orbit → <b className="coin-note">{currencyLine(next.reward)}</b>
          </span>
        </div>
      ) : (
        <p className="muted streak-next">Every orbit milestone reached. Legendary.</p>
      )}

      {secured ? (
        <p className="streak-today done">✓ Orbit secured today</p>
      ) : (
        <div className="streak-today">
          <span>Study today to keep your orbit</span>
          <button
            type="button"
            className="check"
            disabled={!canStudy}
            title={canStudy ? undefined : "Your journey stop has no phrases yet"}
            onClick={onStudy}
          >
            ▶ Study now
          </button>
        </div>
      )}

      {showGrid ? (
        <>
          <Heatmap checked={checked} frozen={frozen} volume={volume} today={today} />
          <div className="heatmap-legend" aria-hidden>
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className={`heatmap-cell l${l}`} />
            ))}
            <span>More</span>
            <span className="legend-sep">·</span>
            <span className="heatmap-cell shield" />
            <span>🛡️ Shield</span>
          </div>
        </>
      ) : (
        <WeekStrip week={currentWeek(today)} checked={checked} frozen={frozen} volume={volume} today={today} />
      )}

      <dl className="streak-summary">
        <div>
          <dt>This month</dt>
          <dd>{plural(summary.thisMonth, "day")}</dd>
        </div>
        <div>
          <dt>All time</dt>
          <dd>{plural(summary.total, "day")}</dd>
        </div>
        <div>
          <dt>Per active day</dt>
          <dd>{summary.avgPhrases === null ? "—" : plural(summary.avgPhrases, "phrase")}</dd>
        </div>
      </dl>

      <p className="streak-shields">
        <span>🛡️ {plural(shields, "Streak Shield")}</span>
        <button type="button" className="link small" onClick={onShop}>
          Get more →
        </button>
      </p>
    </section>
  );
}
