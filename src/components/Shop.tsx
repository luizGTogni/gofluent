"use client";

import { useEffect, useRef, useState } from "react";
import { FREEZE_COST, OXYGEN_COST } from "@/lib/shop";
import { getOxygen, loadInventory } from "@/lib/shopStore";
import type { Wallet } from "@/lib/economy";
import type { ShopItem } from "@/lib/ledger";
import { Currency } from "./Currency";
import { ArrowLeft, Oxygen, Shield } from "./icons";

type Props = {
  wallet: Wallet;
  /** Buys one item; the server charges and delivers it in one step. Resolves to whether it went through. */
  onBuy: (item: ShopItem) => Promise<boolean>;
  onBack: () => void;
};

/** A price in Lunar Coins: shows what's missing ("Need 12 more") when the wallet can't cover it. */
function PriceButton({ price, have, onBuy }: { price: number; have: number; onBuy: () => Promise<unknown> }) {
  const short = price - have;
  // Locked while the purchase is on its way: one click, one purchase.
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const buy = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      await onBuy();
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  // The price always shows on the button; what's still missing goes under it, so it never reads as a price.
  return (
    <>
      <button type="button" className="check" disabled={short > 0 || pending} aria-busy={pending} onClick={buy}>
        {pending ? (
          "Buying…"
        ) : (
          <>
            Buy for <Currency r={{ coins: price }} signed={false} />
          </>
        )}
      </button>
      {short > 0 && !pending && (
        <span className="muted shop-owned">
          {short} more coins needed
        </span>
      )}
    </>
  );
}

/** The store: oxygen extras (a Survival-mode second wind) and Streak Shields. */
export function Shop({ wallet, onBuy, onBack }: Props) {
  const [oxygen, setOxygen] = useState(0);

  useEffect(() => {
    setOxygen(getOxygen());
    loadInventory().then((inv) => setOxygen(inv.oxygen));
  }, []);

  const buyOxygen = async () => {
    if (await onBuy("oxygen")) setOxygen(getOxygen());
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
            <PriceButton price={FREEZE_COST} have={wallet.coins} onBuy={() => onBuy("freeze")} />
          </div>
        </div>
      </section>
    </main>
  );
}
