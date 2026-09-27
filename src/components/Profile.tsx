"use client";

import { useEffect, useState } from "react";
import { cefrBands, cefrEstimate, type PlanetStat } from "@/lib/planetStats";
import { getAccount, getProfile, signOut, type Account, type Profile as ProfileInfo } from "@/lib/auth";
import type { Wallet } from "@/lib/economy";
import type { PlayerState } from "@/lib/xp";
import { levelProgress } from "@/lib/xp";
import { rankOf, starsLabel } from "@/lib/ranks";
import type { StudyCalendar } from "@/lib/economyStore";
import { computeStreak, localDay } from "@/lib/streak";
import { SUITS, type SuitId } from "@/lib/shop";
import { loadInventory, ownedSuits } from "@/lib/shopStore";
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
  onQuests: () => void;
  onShop: () => void;
  onSignedOut: () => void;
};

export function Profile({ player, wallet, calendar, planetStats, trickyCount, onBack, onWords, onTricky, onQuests, onShop, onSignedOut }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [suits, setSuits] = useState<Set<SuitId>>(new Set());

  useEffect(() => {
    getAccount().then(setAccount);
    getProfile().then(setProfile);
    setSuits(ownedSuits());
    loadInventory().then((inv) => setSuits(inv.suits));
  }, []);

  const rank = rankOf(player.rp);
  const lvl = levelProgress(player.xp);
  const streak = computeStreak(calendar.checked, calendar.frozen, localDay(new Date()));
  const bands = cefrBands(planetStats.values(), rank.index);
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
          {SUITS.filter((s) => suits.has(s.id)).map((s) => (
            <span key={s.id} className="profile-avatar-suit" title={s.name}>
              {s.icon}
            </span>
          ))}
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
        <p className="muted profile-note">
          Based on your rank and on how cleanly you finish phrases across planets — this is about skill, not effort. A gamified
          placement test is planned to sharpen this further.
        </p>
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
        <button type="button" className="profile-link" onClick={onQuests}>
          <span>🎯 Missions</span>
          <span className="muted">Daily &amp; weekly quests, badges →</span>
        </button>
        <button type="button" className="profile-link" onClick={onShop}>
          <span>🛒 Store</span>
          <span className="muted">Oxygen, shields, spacesuit →</span>
        </button>
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
