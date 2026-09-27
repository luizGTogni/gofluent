"use client";

import { useEffect, useRef, useState } from "react";
import { levelFromXp, levelProgress } from "@/lib/xp";

/** `animate: false` just shows the level, e.g. where the XP arrives from a load, not a gain. */
type Props = { xp: number; big?: boolean; animate?: boolean };

/**
 * Level bar that animates when `xp` grows: the fill slides forward and a "+N XP" floats up. A
 * level-up fills the bar, snaps it back to empty and fills again into the new level.
 */
export function XpMeter({ xp, big = false, animate = true }: Props) {
  const lvl = levelProgress(xp);
  const [bar, setBar] = useState({ level: lvl.level, pct: lvl.pct, instant: true });
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const prev = useRef(xp);

  useEffect(() => {
    const before = prev.current;
    prev.current = xp;
    const now = levelProgress(xp);
    if (xp <= before || !animate) {
      setBar({ level: now.level, pct: now.pct, instant: true });
      return;
    }
    setGain((g) => ({ n: xp - before, key: (g?.key ?? 0) + 1 }));
    if (now.level === levelFromXp(before)) {
      setBar({ level: now.level, pct: now.pct, instant: false });
      return;
    }
    setBar((b) => ({ ...b, pct: 100, instant: false }));
    const reset = setTimeout(() => setBar({ level: now.level, pct: 0, instant: true }), 650);
    const refill = setTimeout(() => setBar({ level: now.level, pct: now.pct, instant: false }), 700);
    return () => {
      clearTimeout(reset);
      clearTimeout(refill);
    };
  }, [xp, animate]);

  return (
    <div className={`xp-meter ${big ? "big" : ""}`}>
      <span className="xp-meter-level">{big ? `Level ${bar.level}` : `Lv ${bar.level}`}</span>
      <div className="xpbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bar.pct} aria-label={`Progress to level ${bar.level + 1}`}>
        <span style={{ width: `${bar.pct}%`, transition: bar.instant ? "none" : undefined }} />
        {gain && <i key={gain.key} className="xpbar-glow" aria-hidden />}
      </div>
      <span className="xp-meter-num muted">
        {lvl.into}/{lvl.need} XP
      </span>
      {gain && (
        <span key={gain.key} className="xp-float" aria-hidden>
          +{gain.n} XP
        </span>
      )}
    </div>
  );
}
