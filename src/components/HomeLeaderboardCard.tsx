"use client";

import { useEffect, useState } from "react";
import { friendsLeaderboard, type Leaderboard } from "@/lib/social";
import { addDays, localDay } from "@/lib/streak";
import { ArrowRight, Trophy } from "./icons";

const PODIUM_SEEN_KEY = "gofluent:lb-podium-seen";

/** The friends leaderboard, top 5 + your own spot: the rail on wide screens, a card on phones
 * (same idiom as DailyMissions/MissionRail). Once a week it also shows last week's top 3, the one
 * time the period rolls over. */
export function HomeLeaderboardCard({ onOpen }: { onOpen: () => void }) {
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [podium, setPodium] = useState<Leaderboard["players"] | null>(null);

  useEffect(() => {
    friendsLeaderboard("week").then((r) => {
      if (!r.ok) return;
      setBoard(r.data);
      if (!r.data.periodStart) return;
      let seen: string | null = null;
      try {
        seen = localStorage.getItem(PODIUM_SEEN_KEY);
      } catch {
        /* no storage: just skip the once-a-week podium */
      }
      if (seen === r.data.periodStart) return;
      try {
        localStorage.setItem(PODIUM_SEEN_KEY, r.data.periodStart);
      } catch {
        /* ignore */
      }
      if (!seen) return; // first time ever: nothing to look back on yet
      friendsLeaderboard("week", addDays(localDay(new Date()), -7)).then((last) => {
        if (last.ok && last.data.players.length > 1) setPodium(last.data.players.slice(0, 3));
      });
    });
  }, []);

  if (!board) return null;
  const top5 = board.players.slice(0, 5);
  const me = board.players.find((p) => p.isSelf);
  const ahead = me && me.position > 1 ? board.players[me.position - 2] : null;
  const gap = ahead && me ? ahead.xp - me.xp : 0;

  return (
    <section className="side-card lb-card">
      {podium && (
        <div className="lb-podium">
          <p className="muted profile-note">Last week's top 3</p>
          {podium.map((p, i) => (
            <div key={p.username} className="lb-mini-row">
              <span className="lb-position">#{i + 1}</span>
              <span>@{p.username}</span>
              <span className="muted">{p.xp} XP</span>
            </div>
          ))}
          <button type="button" className="link" onClick={() => setPodium(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="side-card-head">
        <b className="icon-text">
          <Trophy /> Friends this week
        </b>
      </div>

      {top5.length <= 1 ? (
        <p className="muted profile-note">Add friends to see a ranking here.</p>
      ) : (
        <>
          {top5.map((p) => (
            <div key={p.username} className={`lb-mini-row ${p.isSelf ? "lb-self" : ""}`}>
              <span className="lb-position">#{p.position}</span>
              <span>{p.isSelf ? "You" : `@${p.username}`}</span>
              <span className="muted">{p.xp} XP</span>
            </div>
          ))}
          {me && me.position > 5 && (
            <div className="lb-mini-row lb-self">
              <span className="lb-position">#{me.position}</span>
              <span>You</span>
              <span className="muted">{me.xp} XP</span>
            </div>
          )}
          {ahead && gap > 0 && (
            <p className="muted profile-note">
              {gap} XP to pass @{ahead.username}
            </p>
          )}
        </>
      )}

      <button type="button" className="link small icon-text" onClick={onOpen}>
        See full leaderboard <ArrowRight />
      </button>
    </section>
  );
}
