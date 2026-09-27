"use client";

import { useEffect, useState } from "react";
import { FREEZE_COST, OXYGEN_COST } from "@/lib/shop";
import { addOxygen, getOxygen, loadInventory } from "@/lib/shopStore";
import type { Wallet } from "@/lib/economy";

type Props = {
  wallet: Wallet;
  /** Deducts currency if the player can afford it; returns whether the purchase went through. */
  onSpend: (coins: number, crystals: number) => boolean;
  /** Streak Shields live on the wallet itself (they're already synced), so this spends and grants
   * the shield in one atomic step rather than going through `onSpend` plus a local counter. */
  onBuyFreeze: () => boolean;
  onBack: () => void;
};

/** A price button: shows what's missing ("Need 12 more 🪙") when the wallet can't cover it. */
function PriceButton({ icon, price, have, onBuy }: { icon: string; price: number; have: number; onBuy: () => void }) {
  const short = price - have;
  return (
    <button type="button" className="check" disabled={short > 0} onClick={onBuy}>
      {short > 0 ? `Need ${short} more ${icon}` : `${icon} ${price}`}
    </button>
  );
}

/** The store: oxygen extras (a Survival-mode second wind) and Streak Shields. */
export function Shop({ wallet, onSpend, onBuyFreeze, onBack }: Props) {
  const [oxygen, setOxygen] = useState(0);

  useEffect(() => {
    setOxygen(getOxygen());
    loadInventory().then((inv) => setOxygen(inv.oxygen));
  }, []);

  const buyOxygen = () => {
    if (onSpend(OXYGEN_COST, 0)) setOxygen(addOxygen(1));
  };

  return (
    <main className="shell center shop">
      <button type="button" className="link mode-picker-back" onClick={onBack}>
        ← Back
      </button>
      <h1 className="hero">Store</h1>
      <p className="muted wallet-row shop-wallet">
        <span>🪙 {wallet.coins} Lunar Coins</span>
        <span>💎 {wallet.crystals} Crystals</span>
      </p>

      <section className="quest-section">
        <h2 className="mode-picker-sub muted">Consumables</h2>
        <div className="shop-grid">
          <div className="shop-card">
            <span className="shop-icon" aria-hidden>
              🫧
            </span>
            <b>Oxygen Extra</b>
            <span className="muted shop-desc">A second wind in Survival: if you'd run out of lives, one tank keeps you going.</span>
            <span className="muted shop-owned">You have: {oxygen}</span>
            <PriceButton icon="🪙" price={OXYGEN_COST} have={wallet.coins} onBuy={buyOxygen} />
          </div>
          <div className="shop-card">
            <span className="shop-icon" aria-hidden>
              🛡️
            </span>
            <b>Streak Shield</b>
            <span className="muted shop-desc">Covers one missed day so your orbit keeps going.</span>
            <span className="muted shop-owned">You have: {wallet.freezes}</span>
            <PriceButton icon="🪙" price={FREEZE_COST} have={wallet.coins} onBuy={onBuyFreeze} />
          </div>
        </div>
      </section>
    </main>
  );
}
