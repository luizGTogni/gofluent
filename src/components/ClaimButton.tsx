"use client";

import { useState } from "react";
import type { QuestDef } from "@/lib/quests";
import { Currency } from "./Currency";
import { Check } from "./icons";

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

  if (claimed && state === "ready")
    return quiet ? null : (
      <span className="claim-done icon-text">
        <Check /> Claimed
      </span>
    );

  if (state === "paid")
    return (
      <span className="claim-paid icon-text" role="status">
        <Check /> <Currency r={def} />
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
      Claim <Currency r={def} />
    </button>
  );
}
