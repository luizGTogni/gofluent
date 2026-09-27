"use client";

import { useEffect, useRef, useState } from "react";
import { cefrBands, cefrEstimate, type PlanetStat } from "@/lib/planetStats";
import { getAccount, getProfile, signOut, type Account, type Profile as ProfileInfo } from "@/lib/auth";
import type { Wallet } from "@/lib/economy";
import type { PlayerState } from "@/lib/xp";
import { levelProgress } from "@/lib/xp";
import { rankOf } from "@/lib/ranks";
import type { StudyCalendar } from "@/lib/economyStore";
import { localDay } from "@/lib/streak";
import { BADGES } from "@/lib/badges";
import { loadBadges, unlockedBadges } from "@/lib/badgeStore";
import { plural } from "@/lib/format";
import { StreakCard } from "./StreakCard";
import { OrbitHistory } from "./Heatmap";
import { Avatar } from "./Avatar";
import { Currency } from "./Currency";
import { Alert, ArrowLeft, ArrowRight, Bookmark, Lock, Store, Target } from "./icons";
import { Medal } from "./icons/Medal";
import { Stars } from "./icons/Stars";

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
  onSettings: () => void;
  /** Starts a session from the orbit card; false while there's nothing to play. */
  canStudy: boolean;
  onStudy: () => void;
  onSignedOut: () => void;
};

export function Profile({ player, wallet, calendar, planetStats, trickyCount, onBack, onWords, onTricky, onQuests, onShop, onSettings, canStudy, onStudy, onSignedOut }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [badges, setBadges] = useState<Set<string>>(new Set());
  const walletRef = useRef<HTMLDivElement>(null);

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
        <button type="button" className="link icon-text" onClick={onBack}>
          <ArrowLeft /> Back
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

      <div ref={walletRef} className="wallet-row profile-wallet">
        <button type="button" className="chip-mini chip-link" onClick={onShop} title="Earned on every phrase you finish">
          <Currency r={{ coins: wallet.coins }} signed={false} units />
        </button>
        <button type="button" className="chip-mini chip-link" onClick={onShop} title="Rare — from rank-ups, level-up moments and orbit milestones">
          <Currency r={{ crystals: wallet.crystals }} signed={false} units />
        </button>
      </div>

      <section className="profile-card">
        <div className="profile-card-head">
          <b>
            {rank.title.name} <Stars n={rank.stars} />
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
      <StreakCard calendar={calendar} today={today} shields={wallet.freezes} canStudy={canStudy} onStudy={onStudy} onShop={onShop} walletRef={walletRef} />
      <OrbitHistory checked={calendar.checked} frozen={calendar.frozen} volume={calendar.volume} today={today} />

      <section className="profile-card">
        <div className="profile-card-head">
          <b>Badges</b>
          <span className="muted">
            {earned.length} of {BADGES.length}
          </span>
        </div>
        {earned.length ? (
          <div className="end-badges">
            {earned.map((b) => (
              <span key={b.id} className="end-badge" title={b.description}>
                <Medal icon={b.icon} rarity={b.rarity} /> {b.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted profile-note">No badges yet. Your first Perfect phrase earns one.</p>
        )}
      </section>

      <nav className="profile-links">
        <button type="button" className="profile-link" onClick={onQuests}>
          <span className="icon-text">
            <Target /> Missions
          </span>
          <span className="muted icon-text">
            Daily &amp; weekly quests, badges <ArrowRight />
          </span>
        </button>
        <button type="button" className="profile-link" onClick={onShop}>
          <span className="icon-text">
            <Store /> Store
          </span>
          <span className="muted icon-text">
            Oxygen and Streak Shields <ArrowRight />
          </span>
        </button>
        <button type="button" className="profile-link" onClick={onWords}>
          <span className="icon-text">
            <Bookmark /> My words
          </span>
          <span className="muted icon-text">
            Saved for later <ArrowRight />
          </span>
        </button>
        <button type="button" className="profile-link" onClick={onTricky}>
          <span className="icon-text">
            <Alert /> Tricky words
          </span>
          <span className="muted icon-text">
            {trickyCount > 0 ? `${trickyCount} to work on` : "None right now"} <ArrowRight />
          </span>
        </button>
        {profile && (
          <button type="button" className="profile-link" onClick={onSettings}>
            <span className="icon-text">
              <Lock /> Profile &amp; privacy
            </span>
            <span className="muted icon-text">
              Bio, friend code, who sees you <ArrowRight />
            </span>
          </button>
        )}
      </nav>
      </div>
      </div>

    </main>
  );
}
