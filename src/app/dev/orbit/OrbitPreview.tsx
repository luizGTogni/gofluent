"use client";

import { useRef, useState } from "react";
import type { StudyCalendar } from "@/lib/economyStore";
import type { DayVolume } from "@/lib/heatmap";
import { addDays, localDay } from "@/lib/streak";
import { StreakCard } from "@/components/StreakCard";
import { OrbitHistory } from "@/components/Heatmap";
import { Currency } from "@/components/Currency";

/** A calendar from day offsets relative to today (0 = today, -1 = yesterday…). */
function fixture(today: string, studied: number[], shielded: number[] = []): StudyCalendar {
  const checked = new Set(studied.map((n) => addDays(today, n)));
  const volume = new Map<string, DayVolume>(studied.map((n) => [addDays(today, n), { phrases: 4 + ((n * 7) % 13 + 13) % 13, xp: 40 + ((n * 11) % 30 + 30) % 30 }]));
  return { checked, frozen: new Set(shielded.map((n) => addDays(today, n))), volume };
}
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export function OrbitPreview() {
  const today = localDay(new Date());
  const walletRef = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  const states: { name: string; calendar: StudyCalendar; shields: number }[] = [
    { name: "New account (0 days)", calendar: fixture(today, []), shields: 0 },
    { name: "1 day studied (today)", calendar: fixture(today, [0]), shields: 0 },
    { name: "Shield in the middle, today pending", calendar: fixture(today, [-5, -4, -2, -1], [-3]), shields: 1 },
    { name: "32-day orbit (between 30 and 100)", calendar: fixture(today, range(-31, 0).filter((n) => n !== -12), [-12]), shields: 2 },
  ];
  const replay = () => {
    try {
      localStorage.removeItem("gofluent:orbitCelebrated");
    } catch {}
    setRun((r) => r + 1);
  };
  return (
    <main className="shell center profile" style={{ maxWidth: 720, gap: 24 }}>
      <div ref={walletRef} className="wallet-row profile-wallet">
        <span className="chip-mini">
          <Currency r={{ coins: 120 }} signed={false} units />
        </span>
        <span className="chip-mini">
          <Currency r={{ crystals: 8 }} signed={false} units />
        </span>
        <button type="button" className="link small" onClick={replay}>
          Replay “secured” moment
        </button>
      </div>
      {states.map((s) => (
        <div key={`${s.name}-${run}`} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }} data-state={s.name}>
          <h2 className="muted" style={{ fontSize: 13, margin: 0 }}>{s.name}</h2>
          <StreakCard calendar={s.calendar} today={today} shields={s.shields} canStudy onStudy={() => {}} onShop={() => {}} walletRef={walletRef} />
          <OrbitHistory checked={s.calendar.checked} frozen={s.calendar.frozen} volume={s.calendar.volume} today={today} />
        </div>
      ))}
    </main>
  );
}
