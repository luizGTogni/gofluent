"use client";

import { useState } from "react";
import { starsLabel, type Rank } from "@/lib/ranks";
import { Avatar } from "./Avatar";

type Props = {
  full: boolean;
  name?: string;
  rank: Rank;
  level: number;
  streak: number;
  coins: number;
  crystals: number;
  onViewProfile: () => void;
  onShop: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
};

type Chip = { key: string; label: React.ReactNode; className?: string; onClick?: () => void; title?: string };

/** The persistent identity strip: brand at the left, the player's standing at the right. */
export function TopBar({ full, name, rank, level, streak, coins, crystals, onViewProfile, onShop, onSignOut, onSignIn }: Props) {
  const [open, setOpen] = useState(false);

  if (!full) {
    return (
      <div className="topbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="GoFluent" className="topbar-logo" />
        <button type="button" className="topbar-name-btn" onClick={onSignIn}>
          <span className="muted">Guest</span>
          <span className="chip-mini accent">Sign in</span>
        </button>
      </div>
    );
  }

  const chips: Chip[] = [
    {
      key: "rank",
      className: "rank-chip-mini",
      label: (
        <>
          {rank.title.name} <span className="stars">{starsLabel(rank.stars)}</span>
        </>
      ),
    },
    { key: "level", label: `Lv ${level}` },
    { key: "streak", label: `🛰️ ${streak}`, onClick: onViewProfile, title: "Your orbit — open profile" },
    { key: "coins", label: `🪙 ${coins}`, onClick: onShop, title: "Lunar Coins — open store" },
    { key: "crystals", label: `💎 ${crystals}`, onClick: onShop, title: "Crystals — open store" },
  ];

  return (
    <div className="topbar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="GoFluent" className="topbar-logo" />
      <div className="topbar-you">
        <div className="topbar-you-wrap" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
          <button
            type="button"
            className="topbar-name-btn"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <Avatar className="topbar-avatar" />
            {name ?? "Profile"}
          </button>
          {open && (
            <div className="topbar-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onViewProfile();
                }}
              >
                View profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
        <span className="topbar-chips">
          {chips.map((c) =>
            c.onClick ? (
              <button key={c.key} type="button" className={`chip-mini chip-link ${c.className ?? ""}`} onClick={c.onClick} title={c.title}>
                {c.label}
              </button>
            ) : (
              <span key={c.key} className={`chip-mini ${c.className ?? ""}`}>
                {c.label}
              </span>
            ),
          )}
        </span>
      </div>
    </div>
  );
}
