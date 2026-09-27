"use client";

import { useState } from "react";
import { starsLabel, type Rank } from "@/lib/ranks";

type Props = {
  full: boolean;
  name?: string;
  rank: Rank;
  level: number;
  streak: number;
  coins: number;
  crystals: number;
  onViewProfile: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
};

/** The persistent identity strip: brand at the left, the player's standing at the right. */
export function TopBar({ full, name, rank, level, streak, coins, crystals, onViewProfile, onSignOut, onSignIn }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="topbar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="GoFluent" className="topbar-logo" />
      {full ? (
        <div className="topbar-you-wrap" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
          <button type="button" className="topbar-you" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
            <span className="topbar-name">{name ?? "Profile"}</span>
            <span className="topbar-chips">
              <span className="chip-mini rank-chip-mini">
                {rank.title.name} <span className="stars">{starsLabel(rank.stars)}</span>
              </span>
              <span className="chip-mini">Lv {level}</span>
              <span className="chip-mini">🛰️ {streak}</span>
              <span className="chip-mini">🪙 {coins}</span>
              <span className="chip-mini">💎 {crystals}</span>
            </span>
          </button>
          {open && (
            <div className="topbar-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onViewProfile(); }}>
                View profile
              </button>
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onSignOut(); }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button type="button" className="topbar-you" onClick={onSignIn}>
          <span className="topbar-name muted">Guest</span>
          <span className="chip-mini accent">Sign in</span>
        </button>
      )}
    </div>
  );
}
