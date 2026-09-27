"use client";

import { useState } from "react";
import { plural } from "@/lib/format";
import type { Rank } from "@/lib/ranks";
import { Avatar } from "./Avatar";
import { Coin, Crystal, Orbit } from "./icons";
import { Stars } from "./icons/Stars";

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

/** `name` is what screen readers hear when the label is mostly an icon. */
type Chip = { key: string; label: React.ReactNode; className?: string; onClick?: () => void; title?: string; name?: string };

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
          {rank.title.name} <Stars n={rank.stars} />
        </>
      ),
    },
    { key: "level", label: `Lv ${level}` },
    {
      key: "streak",
      label: (
        <>
          <Orbit /> {streak}
        </>
      ),
      onClick: onViewProfile,
      title: "Your orbit — open profile",
      name: `Orbit: ${plural(streak, "day")}. Open your profile`,
    },
    {
      key: "coins",
      label: (
        <>
          <Coin /> {coins}
        </>
      ),
      onClick: onShop,
      title: "Lunar Coins — open store",
      name: `${plural(coins, "Lunar Coin")}. Open the Store`,
    },
    {
      key: "crystals",
      label: (
        <>
          <Crystal /> {crystals}
        </>
      ),
      onClick: onShop,
      title: "Crystals — open store",
      name: `${plural(crystals, "Crystal")}. Open the Store`,
    },
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
              <button
                key={c.key}
                type="button"
                className={`chip-mini chip-link icon-text ${c.className ?? ""}`}
                onClick={c.onClick}
                title={c.title}
                aria-label={c.name}
              >
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
