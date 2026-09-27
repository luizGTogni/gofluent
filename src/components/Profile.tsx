"use client";

import { useEffect, useState } from "react";
import { cefrBands, cefrEstimate, type PlanetStat } from "@/lib/planetStats";
import { getAccount, getProfile, signOut, type Account, type Profile as ProfileInfo } from "@/lib/auth";
import type { Wallet } from "@/lib/economy";
import type { PlayerState } from "@/lib/xp";
import { levelProgress } from "@/lib/xp";
import { rankOf, starsLabel } from "@/lib/ranks";
import type { StudyCalendar } from "@/lib/economyStore";
import { computeStreak, utcDay } from "@/lib/streak";
import { Heatmap } from "./Heatmap";

type Props = {
  player: PlayerState;
  wallet: Wallet;
  calendar: StudyCalendar;
  planetStats: Map<string, PlanetStat>;
  trickyCount: number;
  savedCount: number;
  onBack: () => void;
  onWords: () => void;
  onTricky: () => void;
  onSignedOut: () => void;
};

export function Profile({ player, wallet, calendar, planetStats, trickyCount, onBack, onWords, onTricky, onSignedOut }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);

  useEffect(() => {
    getAccount().then(setAccount);
    getProfile().then(setProfile);
  }, []);

  const rank = rankOf(player.rp);
  const lvl = levelProgress(player.xp);
  const streak = computeStreak(calendar.checked, calendar.frozen, utcDay(new Date()));
  const bands = cefrBands(planetStats.values());
  const estimate = cefrEstimate(bands);

  const leave = async () => {
    await signOut();
    onSignedOut();
  };

  return (
    <main className="shell center profile">
      <div className="profile-topbar">
        <button type="button" className="link" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="link" onClick={leave}>
          Sign out
        </button>
      </div>

      <div className="profile-head">
        <span className="profile-avatar" aria-hidden>
          🧑‍🚀
        </span>
        <div>
          <h1 className="profile-title">{profile?.fullName ?? "Your profile"}</h1>
          <p className="muted">{profile ? `@${profile.username}` : account?.email}</p>
        </div>
      </div>

      <section className="profile-card">
        <div className="profile-card-head">
          <b>
            {rank.title.name} <span className="stars">{starsLabel(rank.stars)}</span>
          </b>
          <span className="muted">Level {lvl.level}</span>
        </div>
        <div className="xpbar">
          <span style={{ width: `${lvl.pct}%` }} />
        </div>
        <p className="muted profile-note">
          {lvl.into}/{lvl.need} XP to level {lvl.level + 1}. Your level only ever grows — it's a record of the work you've put in. Your
          rank can dim a little if you're away for a while, and it always comes back as you study.
        </p>
      </section>

      <section className="profile-card">
        <div className="profile-card-head">
          <b>Estimated English level</b>
          <span className="chip-cefr">{estimate ?? "—"}</span>
        </div>
        <p className="muted profile-note">Based on how cleanly you finish phrases across courses — this is about skill, not effort.</p>
      </section>

      <section className="profile-card">
        <div className="profile-card-head">
          <b>🛰️ {streak.current}-day orbit</b>
          <span className="muted">Best: {streak.longest} days</span>
        </div>
        <Heatmap checked={calendar.checked} frozen={calendar.frozen} />
        <p className="muted profile-note">Every green square is a day you studied. A ringed square is a day an energy shield covered for you.</p>
        <div className="wallet-row">
          <span title="Earned on every phrase you finish">🪙 {wallet.coins} Lunar Coins</span>
          <span title="Rare — from rank-ups, level-up moments and orbit milestones">💎 {wallet.crystals} Crystals</span>
          <span title="Cover one missed day so your orbit keeps going">⚡ {wallet.freezes} shields</span>
        </div>
      </section>

      <nav className="profile-links">
        <button type="button" className="profile-link" onClick={onWords}>
          <span>💾 My words</span>
          <span className="muted">Saved for later →</span>
        </button>
        <button type="button" className="profile-link" onClick={onTricky}>
          <span>🎯 Tricky words</span>
          <span className="muted">{trickyCount > 0 ? `${trickyCount} to work on →` : "None right now →"}</span>
        </button>
      </nav>

    </main>
  );
}
