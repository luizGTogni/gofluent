import type { ComponentType } from "react";
import { plural } from "@/lib/format";
import type { Amounts } from "@/lib/rewards";
import { Coin, Crystal, Shield, type IconProps } from "./icons";

const KINDS: { key: keyof Amounts; Glyph: ComponentType<IconProps>; unit: string; className: string }[] = [
  { key: "coins", Glyph: Coin, unit: "Lunar Coin", className: "coin-note" },
  { key: "crystals", Glyph: Crystal, unit: "Crystal", className: "crystal-note" },
  { key: "freezes", Glyph: Shield, unit: "Streak Shield", className: "shield-note" },
];

type Props = {
  r: Amounts;
  /** Show "+15" (earned) rather than "15" (a price or a balance). */
  signed?: boolean;
  /** Spell the unit out ("+15 Lunar Coins"); otherwise only screen readers hear it. */
  units?: boolean;
  className?: string;
};

/** Amounts of the game's currencies, each behind its icon, skipping zeros. */
export function Currency({ r, signed = true, units = false, className = "" }: Props) {
  return (
    <span className={`currency ${className}`}>
      {KINDS.filter((k) => r[k.key]).map(({ key, Glyph, unit, className: tone }) => {
        const n = r[key]!;
        const words = plural(n, unit).slice(String(n).length);
        return (
          <span key={key} className={`currency-item ${tone}`}>
            <Glyph />
            {signed ? `+${n}` : n}
            {units ? words : <span className="sr-only">{words}</span>}
          </span>
        );
      })}
    </span>
  );
}
