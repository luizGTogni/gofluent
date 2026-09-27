"use client";

import { useEffect, useState } from "react";
import { friendsLeaderboard, rankTitle, type Leaderboard as LeaderboardData, type LeaderboardPeriod } from "@/lib/social";
import { ArrowLeft, ArrowRight, Trophy } from "./icons";
import { Stars } from "./icons/Stars";

type Props = { onBack: () => void; onOpenProfile: (username: string) => void };

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

const delta = (d: number | null) => {
  if (!d) return <span className="muted lb-delta">—</span>;
  const up = d > 0;
  return (
    <span className={`lb-delta ${up ? "lb-up" : "lb-down"}`}>
      <ArrowRight style={{ transform: `rotate(${up ? -90 : 90}deg)` }} /> {Math.abs(d)}
    </span>
  );
};

export function Leaderboard({ onBack, onOpenProfile }: Props) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [board, setBoard] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBoard(null);
    friendsLeaderboard(period).then((r) => (r.ok ? setBoard(r.data) : setError(r.error)));
  }, [period]);

  return (
    <main className="shell center profile">
      <div className="profile-topbar">
        <button type="button" className="link icon-text" onClick={onBack}>
          <ArrowLeft /> Back
        </button>
      </div>

      <h1 className="profile-title icon-text">
        <Trophy /> Friends leaderboard
      </h1>

      <div className="social-tabs" role="tablist">
        {PERIODS.map((p) => (
          <button key={p.value} type="button" role="tab" aria-selected={period === p.value} className={`social-tab ${period === p.value ? "on" : ""}`} onClick={() => setPeriod(p.value)}>
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="auth-error">{error}</p>}

      {board === null ? (
        <p className="muted">Loading…</p>
      ) : board.players.length <= 1 ? (
        <p className="muted profile-note">Add friends to see how you compare — it's just you here so far.</p>
      ) : (
        <div className="social-list lb-list">
          {board.players.map((p) => (
            <button key={p.username} type="button" className={`social-row lb-row ${p.isSelf ? "lb-self" : ""}`} onClick={() => (p.isSelf ? undefined : onOpenProfile(p.username))} disabled={p.isSelf}>
              <span className="lb-position">#{p.position}</span>
              <span className="social-row-name">
                @{p.username} <Stars n={p.rank.stars} />
                <span className="muted social-row-meta">
                  {rankTitle(p.rank).name} · {p.streak} day streak
                </span>
              </span>
              <span className="lb-xp">{p.xp} XP</span>
              {delta(p.delta)}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
