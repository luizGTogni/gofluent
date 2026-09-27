"use client";

import { useEffect, useRef } from "react";
import { REWARD_KICKER, type Reward } from "@/lib/rewards";

const SHOW_MS = 4200;
const MAX_SHOWN = 3;

function Toast({ reward, onDismiss }: { reward: Reward; onDismiss: (id: number) => void }) {
  // The timer should run once per toast, even if the parent hands over a new callback.
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    const t = setTimeout(() => dismiss.current(reward.id), SHOW_MS);
    return () => clearTimeout(t);
  }, [reward.id]);

  return (
    <button type="button" className={`toast toast-${reward.kind}`} onClick={() => onDismiss(reward.id)} title="Dismiss">
      <span className="toast-icon" aria-hidden>
        {reward.icon}
      </span>
      <span className="toast-body">
        <span className="toast-kicker">{REWARD_KICKER[reward.kind]}</span>
        <b>{reward.title}</b>
        {reward.detail && <span className="muted toast-detail">{reward.detail}</span>}
      </span>
    </button>
  );
}

/** Stack of passing reward moments: badges, missions, orbit milestones. Tap one to dismiss it. */
export function RewardToasts({ rewards, onDismiss }: { rewards: Reward[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {rewards.slice(-MAX_SHOWN).map((r) => (
        <Toast key={r.id} reward={r} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
