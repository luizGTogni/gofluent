"use client";

import type { Wallet } from "@/lib/economy";
import { plural } from "@/lib/format";
import { starsLabel, type Rank } from "@/lib/ranks";
import { Avatar } from "./Avatar";
import { XpMeter } from "./XpMeter";

type Props = { name?: string; rank: Rank; xp: number; streak: number; wallet: Wallet; onProfile: () => void };

/** Desktop home, left rail: who you are and what you hold, at a glance. */
export function PlayerCard({ name, rank, xp, streak, wallet, onProfile }: Props) {
  return (
    <section className="side-card player-card">
      <button type="button" className="player-card-id" onClick={onProfile} title="View profile">
        <Avatar />
        <span>
          <b>{name ?? "Your profile"}</b>
          <span className="rank-line">
            {rank.title.name} <span className="stars">{starsLabel(rank.stars)}</span>
          </span>
        </span>
      </button>
      <XpMeter xp={xp} animate={false} />
      <div className="player-card-streak">
        <span>🛰️</span>
        <span>
          <b>{plural(streak, "day")}</b> <span className="muted">in orbit</span>
        </span>
      </div>
      <ul className="player-card-wallet">
        <li>
          <span>🪙 Lunar Coins</span>
          <b>{wallet.coins}</b>
        </li>
        <li>
          <span>💎 Crystals</span>
          <b>{wallet.crystals}</b>
        </li>
        <li>
          <span>🛡️ Streak Shields</span>
          <b>{wallet.freezes}</b>
        </li>
      </ul>
    </section>
  );
}
