"use client";

import { useEffect, useState } from "react";
import { FREEZE_COST, OXYGEN_COST, SUITS, type SuitId } from "@/lib/shop";
import { addOxygen, buySuit, getOxygen, loadInventory, ownedSuits } from "@/lib/shopStore";
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

/** The store: oxygen extras (a Survival-mode second wind), Streak Shields, and spacesuit pieces —
 * cosmetic, cumulative, shown next to the avatar in the profile once owned. */
export function Shop({ wallet, onSpend, onBuyFreeze, onBack }: Props) {
  const [oxygen, setOxygen] = useState(0);
  const [suits, setSuits] = useState<Set<SuitId>>(new Set());

  useEffect(() => {
    setOxygen(getOxygen());
    setSuits(ownedSuits());
    loadInventory().then((inv) => {
      setOxygen(inv.oxygen);
      setSuits(inv.suits);
    });
  }, []);

  const buyOxygen = () => {
    if (onSpend(OXYGEN_COST, 0)) setOxygen(addOxygen(1));
  };

  const handleBuySuit = (id: SuitId) => {
    if (suits.has(id)) return;
    const def = SUITS.find((s) => s.id === id);
    if (def && onSpend(0, def.crystals)) setSuits(buySuit(id));
  };

  return (
    <main className="shell center">
      <button type="button" className="link mode-picker-back" onClick={onBack}>
        ← Back
      </button>
      <h1 className="hero">Store</h1>
      <p className="muted wallet-row">
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
            <button type="button" className="check" disabled={wallet.coins < OXYGEN_COST} onClick={buyOxygen}>
              🪙 {OXYGEN_COST}
            </button>
          </div>
          <div className="shop-card">
            <span className="shop-icon" aria-hidden>
              🛡️
            </span>
            <b>Streak Shield</b>
            <span className="muted shop-desc">Covers one missed day so your orbit keeps going.</span>
            <span className="muted shop-owned">You have: {wallet.freezes}</span>
            <button type="button" className="check" disabled={wallet.coins < FREEZE_COST} onClick={onBuyFreeze}>
              🪙 {FREEZE_COST}
            </button>
          </div>
        </div>
      </section>

      <section className="quest-section">
        <h2 className="mode-picker-sub muted">Spacesuit</h2>
        <div className="shop-grid">
          {SUITS.map((s) => {
            const owned = suits.has(s.id);
            return (
              <div key={s.id} className={`shop-card ${owned ? "owned" : ""}`}>
                <span className="shop-icon" aria-hidden>
                  {s.icon}
                </span>
                <b>{s.name}</b>
                <span className="muted shop-desc">{s.description}</span>
                {owned ? (
                  <span className="shop-owned-tag">✅ Owned</span>
                ) : (
                  <button type="button" className="check" disabled={wallet.crystals < s.crystals} onClick={() => handleBuySuit(s.id)}>
                    💎 {s.crystals}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
