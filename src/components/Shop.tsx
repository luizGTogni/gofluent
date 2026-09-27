"use client";

import { useEffect, useState } from "react";
import { FREEZE_COST, OXYGEN_COST } from "@/lib/shop";
import { addOxygen, getOxygen, loadInventory } from "@/lib/shopStore";
import type { Wallet } from "@/lib/economy";
import { Currency } from "./Currency";
import { ArrowLeft, Oxygen, Shield } from "./icons";

type Props = {
  wallet: Wallet;
  /** Deducts currency if the player can afford it; returns whether the purchase went through. */
  onSpend: (coins: number, crystals: number) => boolean;
  /** Streak Shields live on the wallet itself (they're already synced), so this spends and grants
   * the shield in one atomic step rather than going through `onSpend` plus a local counter. */
  onBuyFreeze: () => boolean;
  onBack: () => void;
};

/** A price in Lunar Coins: shows what's missing ("Need 12 more") when the wallet can't cover it. */
function PriceButton({ price, have, onBuy }: { price: number; have: number; onBuy: () => void }) {
  const short = price - have;
  return (
    <button type="button" className="check" disabled={short > 0} onClick={onBuy}>
      {short > 0 ? (
        <>
          Need <Currency r={{ coins: short }} signed={false} /> more
        </>
      ) : (
        <>
          Buy for <Currency r={{ coins: price }} signed={false} />
        </>
      )}
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
      <button type="button" className="link mode-picker-back icon-text" onClick={onBack}>
        <ArrowLeft /> Back
      </button>
      <h1 className="hero">Store</h1>
      <p className="muted wallet-row shop-wallet">
        <Currency r={{ coins: wallet.coins }} signed={false} units />
        <Currency r={{ crystals: wallet.crystals }} signed={false} units />
      </p>

      <section className="quest-section">
        <h2 className="mode-picker-sub muted">Consumables</h2>
        <div className="shop-grid">
          <div className="shop-card">
            <Oxygen size="xl" className="shop-icon" />
            <b>Oxygen Extra</b>
            <span className="muted shop-desc">A second wind in Survival: if you'd run out of lives, one tank keeps you going.</span>
            <span className="muted shop-owned">You have: {oxygen}</span>
            <PriceButton price={OXYGEN_COST} have={wallet.coins} onBuy={buyOxygen} />
          </div>
          <div className="shop-card">
            <Shield size="xl" className="shop-icon" />
            <b>Streak Shield</b>
            <span className="muted shop-desc">Covers one missed day so your orbit keeps going.</span>
            <span className="muted shop-owned">You have: {wallet.freezes}</span>
            <PriceButton price={FREEZE_COST} have={wallet.coins} onBuy={onBuyFreeze} />
          </div>
        </div>
      </section>
    </main>
  );
}
