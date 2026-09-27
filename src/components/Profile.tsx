"use client";

import { useEffect, useState } from "react";
import { cefrBands, cefrEstimate, type PlanetStat } from "@/lib/planetStats";
import { getAccount, getProfile, signOut, type Account, type Profile as ProfileInfo } from "@/lib/auth";
import type { Wallet } from "@/lib/economy";
import type { PlayerState } from "@/lib/xp";
import { levelProgress } from "@/lib/xp";
import { rankOf, starsLabel } from "@/lib/ranks";
import type { StudyCalendar } from "@/lib/economyStore";
import { localDay } from "@/lib/streak";
import { BADGES } from "@/lib/badges";
import { loadBadges, unlockedBadges } from "@/lib/badgeStore";
import { plural } from "@/lib/format";
import { StreakCard } from "./StreakCard";
import { Avatar } from "./Avatar";

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
  onQuests: () => void;
  onShop: () => void;
  /** Starts a session from the orbit card; false while there's nothing to play. */
  canStudy: boolean;
  onStudy: () => void;
  onSignedOut: () => void;
};

export function Profile({ player, wallet, calendar, planetStats, trickyCount, onBack, onWords, onTricky, onQuests, onShop, canStudy, onStudy, onSignedOut }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [badges, setBadges] = useState<Set<string>>(new Set());

  useEffect(() => {
    getAccount().then(setAccount);
    getProfile().then(setProfile);
    setBadges(unlockedBadges());
    loadBadges().then(setBadges);
  }, []);

  const rank = rankOf(player.rp);
  const lvl = levelProgress(player.xp);
  const bands = cefrBands(planetStats.values(), rank.index);
  const estimate = cefrEstimate(bands);
  const today = localDay(new Date());
  const earned = BADGES.filter((b) => badges.has(b.id));

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

      <div className="profile-grid">
      <div className="profile-col">
      <div className="profile-head">
        <Avatar />
        <div>
          <h1 className="profile-title">{profile?.fullName ?? "Your profile"}</h1>
          <p className="muted">{profile ? `@${profile.username}` : account?.email}</p>
        </div>
      </div>

      <div className="wallet-row profile-wallet">
        <button type="button" className="chip-mini chip-link" onClick={onShop} title="Earned on every phrase you finish">
          🪙 {wallet.coins} Lunar Coins
        </button>
        <button type="button" className="chip-mini chip-link" onClick={onShop} title="Rare — from rank-ups, level-up moments and orbit milestones">
          💎 {wallet.crystals} Crystals
        </button>
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
        <p className="muted profile-note">
          Based on your rank and on how cleanly you finish phrases across planets — this is about skill, not effort. A gamified
          placement test is planned to sharpen this further.
        </p>
      </section>

      </div>

      <div className="profile-col">
      <StreakCard calendar={calendar} today={today} shields={wallet.freezes} canStudy={canStudy} onStudy={onStudy} onShop={onShop} />

      <section className="profile-card">
        <div className="profile-card-head">
          <b>🏅 Badges</b>
          <span className="muted">
            {earned.length} of {BADGES.length}
          </span>
        </div>
        {earned.length ? (
          <div className="end-badges">
            {earned.map((b) => (
              <span key={b.id} className="end-badge" title={b.description}>
                <span aria-hidden>{b.icon}</span> {b.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted profile-note">No badges yet. Your first Perfect phrase earns one.</p>
        )}
      </section>

      <nav className="profile-links">
        <button type="button" className="profile-link" onClick={onQuests}>
          <span>🎯 Missions</span>
          <span className="muted">Daily &amp; weekly quests, badges →</span>
        </button>
        <button type="button" className="profile-link" onClick={onShop}>
          <span>🛒 Store</span>
          <span className="muted">Oxygen, Streak Shields, spacesuit →</span>
        </button>
        <button type="button" className="profile-link" onClick={onWords}>
          <span>💾 My words</span>
          <span className="muted">Saved for later →</span>
        </button>
        <button type="button" className="profile-link" onClick={onTricky}>
          <span>🧩 Tricky words</span>
          <span className="muted">{trickyCount > 0 ? `${trickyCount} to work on →` : "None right now →"}</span>
        </button>
      </nav>
      </div>
      </div>

    </main>
  );
}
