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
import { plural } from "@/lib/format";
import { checkAdmin } from "@/lib/adminStore";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import { cachedAchievements, loadAchievements, type AchievementState } from "@/lib/achievementStore";
import { StreakCard } from "./StreakCard";
import { OrbitHistory } from "./Heatmap";
import { Avatar } from "./Avatar";
import { Currency } from "./Currency";
import { Alert, ArrowLeft, ArrowRight, Bookmark, Lock, Store, Target, Users } from "./icons";
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
  onAchievements: () => void;
  onFriends: () => void;
  /** Starts a session from the orbit card; false while there's nothing to play. */
  canStudy: boolean;
  onStudy: () => void;
  onSignedOut: () => void;
};

export function Profile({ player, wallet, calendar, planetStats, trickyCount, onBack, onWords, onTricky, onQuests, onShop, onSettings, onAchievements, onFriends, canStudy, onStudy, onSignedOut }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [admin, setAdmin] = useState(false);
  const [achievements, setAchievements] = useState<AchievementState>({ unlocked: new Map(), metrics: {} });
  const walletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAccount().then(setAccount);
    getProfile().then(setProfile);
    checkAdmin().then((ok) => setAdmin(ok === true));
    setAchievements(cachedAchievements());
    loadAchievements().then(setAchievements);
  }, []);

  const rank = rankOf(player.rp);
  const lvl = levelProgress(player.xp);
  const bands = cefrBands(planetStats.values(), rank.index);
  const estimate = cefrEstimate(bands);
  const today = localDay(new Date());
  const achieved = ACHIEVEMENTS.filter((d) => achievements.unlocked.has(d.id)).length;
  // The latest unlocked first (the cache has no dates: then in catalogue order).
  const recent = [...achievements.unlocked.entries()]
    .sort(([, a], [, b]) => b.localeCompare(a))
    .map(([id]) => ACHIEVEMENT_BY_ID.get(id))
    .filter((d) => d !== undefined)
    .slice(0, 6);

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
        <span style={{ display: "flex", gap: 16 }}>
          {admin && (
            <a href="/admin" className="link">
              Admin
            </a>
          )}
          <button type="button" className="link" onClick={leave}>
            Sign out
          </button>
        </span>
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
          <b>Achievements</b>
          <span className="muted">
            {achieved} of {ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="xpbar" aria-hidden>
          <span style={{ width: `${Math.round((achieved / ACHIEVEMENTS.length) * 100)}%` }} />
        </div>
        {recent.length > 0 ? (
          <div className="end-badges">
            {recent.map((d) => (
              <span key={d.id} className="end-badge" title={d.description}>
                <Medal icon={d.icon} rarity={d.rarity} /> {d.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted profile-note">Your first phrase unlocks the first one.</p>
        )}
        <button type="button" className="link icon-text settings-left" onClick={onAchievements}>
          See all {ACHIEVEMENTS.length} <ArrowRight />
        </button>
      </section>

      <nav className="profile-links">
        {profile && (
          <button type="button" className="profile-link" onClick={onFriends}>
            <span className="icon-text">
              <Users /> Friends
            </span>
            <span className="muted icon-text">
              Requests, search, leaderboard <ArrowRight />
            </span>
          </button>
        )}
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
