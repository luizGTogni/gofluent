"use client";

import { useEffect, useState } from "react";
import { COSMETIC_KIND_LABEL, COSMETICS, FREEZE_COST, OXYGEN_COST, SUITS, type CosmeticKind, type SuitId } from "@/lib/shop";
import { addOxygen, buyCosmetic, buySuit, equipCosmetic, equippedCosmetics, getOxygen, loadInventory, ownedCosmetics, ownedSuits, type Equipped } from "@/lib/shopStore";
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

const KINDS: CosmeticKind[] = ["trail", "halo"];

/** The store: oxygen extras (a Survival-mode second wind), Streak Shields, spacesuit pieces (worn
 * by your avatar in the top bar and profile), and journey cosmetics — where Crystals go. */
export function Shop({ wallet, onSpend, onBuyFreeze, onBack }: Props) {
  const [oxygen, setOxygen] = useState(0);
  const [suits, setSuits] = useState<Set<SuitId>>(new Set());
  const [cosmetics, setCosmetics] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<Equipped>({});

  useEffect(() => {
    setOxygen(getOxygen());
    setSuits(ownedSuits());
    setCosmetics(ownedCosmetics());
    setEquipped(equippedCosmetics());
    loadInventory().then((inv) => {
      setOxygen(inv.oxygen);
      setSuits(inv.suits);
      setCosmetics(inv.cosmetics);
      setEquipped(inv.equipped);
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
                  <PriceButton icon="💎" price={s.crystals} have={wallet.crystals} onBuy={() => handleBuySuit(s.id)} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {KINDS.map((kind) => (
        <section key={kind} className="quest-section">
          <h2 className="mode-picker-sub muted">{COSMETIC_KIND_LABEL[kind]}</h2>
          <div className="shop-grid">
            {COSMETICS.filter((c) => c.kind === kind).map((c) => {
              const owned = cosmetics.has(c.id);
              const worn = equipped[kind] === c.id;
              return (
                <div key={c.id} className={`shop-card ${owned ? "owned" : ""}`}>
                  <span className={`cosmetic-swatch cosmetic-${kind}`} style={{ "--swatch": c.color } as React.CSSProperties} aria-hidden />
                  <b>{c.name}</b>
                  <span className="muted shop-desc">{c.description}</span>
                  {owned ? (
                    <button type="button" className={`check ${worn ? "" : "ghost"}`} aria-pressed={worn} onClick={() => setEquipped(equipCosmetic(kind, worn ? null : c.id))}>
                      {worn ? "✓ Wearing" : "Wear"}
                    </button>
                  ) : (
                    <PriceButton
                      icon="💎"
                      price={c.crystals}
                      have={wallet.crystals}
                      onBuy={() => {
                        if (!onSpend(0, c.crystals)) return;
                        setCosmetics(buyCosmetic(c.id));
                        setEquipped(equipCosmetic(kind, c.id));
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
