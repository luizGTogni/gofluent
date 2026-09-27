"use client";

import { useState } from "react";
import type { QuestDef } from "@/lib/quests";
import { currencyLine } from "@/lib/rewards";

export type OnClaim = (def: QuestDef, periodKey: string) => Promise<boolean>;

type Props = {
  def: QuestDef;
  periodKey: string;
  claimed: boolean;
  onClaim: OnClaim;
  /** Compact lists already show a check: render nothing once claimed (outside the claim moment). */
  quiet?: boolean;
};

/**
 * A reached mission's reward: a pulsing Claim button, then the reward pops out of it. Rendered for
 * every reached mission; one claimed earlier (or elsewhere) just reads "Claimed".
 */
export function ClaimButton({ def, periodKey, claimed, onClaim, quiet = false }: Props) {
  const [state, setState] = useState<"ready" | "claiming" | "paid">("ready");

  if (claimed && state === "ready") return quiet ? null : <span className="claim-done">✅ Claimed</span>;

  if (state === "paid")
    return (
      <span className="claim-paid" role="status">
        ✓ {currencyLine(def)}
      </span>
    );

  return (
    <button
      type="button"
      className="check claim-btn"
      disabled={state === "claiming"}
      onClick={async () => {
        setState("claiming");
        setState((await onClaim(def, periodKey)) ? "paid" : "ready");
      }}
    >
      Claim {currencyLine(def)}
    </button>
  );
}
