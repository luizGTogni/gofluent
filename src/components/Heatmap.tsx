"use client";

import { addDays, localDay } from "@/lib/streak";
import { plural } from "@/lib/format";

const WEEKS = 14;

/** GitHub-style grid of the last ~14 weeks, on the learner's clock. Green = studied, blue ring = bridged by a Streak Shield. */
export function Heatmap({ checked, frozen }: { checked: ReadonlySet<string>; frozen: ReadonlySet<string> }) {
  const today = localDay(new Date());
  const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const start = addDays(today, -(WEEKS * 7 - 1) - todayDow);

  const weeks = Array.from({ length: WEEKS + 1 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(start, w * 7 + d);
      return day > today ? null : day;
    }),
  );

  return (
    <div className="heatmap" role="img" aria-label={`${plural(checked.size, "day")} studied in the last ${WEEKS} weeks`}>
      {weeks.map((week, w) => (
        <div key={w} className="heatmap-col">
          {week.map((day, d) =>
            day === null ? (
              <span key={d} className="heatmap-cell empty" />
            ) : (
              <span
                key={d}
                className={`heatmap-cell ${checked.has(day) ? "on" : ""} ${frozen.has(day) ? "frozen" : ""}`}
                title={`${day}${checked.has(day) ? " · studied" : frozen.has(day) ? " · covered by a Streak Shield" : ""}`}
              />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
