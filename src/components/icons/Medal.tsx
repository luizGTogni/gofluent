import type { Rarity } from "@/lib/achievements";
import type { IconName } from "@/lib/icons";
import { NamedIcon } from "./index";
import { Lock } from "./interface";

/**
 * A badge's medallion: its icon at the centre of a ring in the rarity's colour. Locked, it's a grey
 * silhouette with a lock. Sized by font-size (the medallion is 2.4em across).
 */
export function Medal({ icon, rarity, locked = false, className = "" }: { icon: IconName; rarity: Rarity; locked?: boolean; className?: string }) {
  return (
    <span className={`medal rarity-${rarity} ${locked ? "locked" : ""} ${className}`} aria-hidden>
      <NamedIcon name={icon} />
      {locked && (
        <span className="medal-lock">
          <Lock />
        </span>
      )}
    </span>
  );
}
