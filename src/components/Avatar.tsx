"use client";

import { useEffect, useState } from "react";
import { SUITS, type SuitId } from "@/lib/shop";
import { loadInventory, ownedSuits } from "@/lib/shopStore";

/** The astronaut, wearing every spacesuit piece bought in the store. */
export function Avatar({ className = "profile-avatar" }: { className?: string }) {
  const [suits, setSuits] = useState<Set<SuitId>>(new Set());

  useEffect(() => {
    setSuits(ownedSuits());
    loadInventory().then((inv) => setSuits(inv.suits));
  }, []);

  return (
    <span className={className} aria-hidden>
      🧑‍🚀
      {SUITS.filter((s) => suits.has(s.id)).map((s) => (
        <span key={s.id} className="profile-avatar-suit" title={s.name}>
          {s.icon}
        </span>
      ))}
    </span>
  );
}
