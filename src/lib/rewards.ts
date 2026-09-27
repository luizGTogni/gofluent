// What a session earns, and the celebratory moments it produces. Kept pure: Session owns the state.
import type { AchievementDef } from "./achievements";
import { plural } from "./format";
import type { IconName } from "./icons";
import type { QuestDef } from "./quests";

/**
 * One reward hierarchy, everywhere: XP is progress (always shown first), Lunar Coins are for
 * spending, Crystals are rare. Streak Shields ride along with the currencies.
 */
export type SessionGains = { xp: number; coins: number; crystals: number; freezes: number };
export const emptyGains: SessionGains = { xp: 0, coins: 0, crystals: 0, freezes: 0 };

export const addGains = (g: SessionGains, more: Partial<SessionGains>): SessionGains => ({
  xp: g.xp + (more.xp ?? 0),
  coins: g.coins + (more.coins ?? 0),
  crystals: g.crystals + (more.crystals ?? 0),
  freezes: g.freezes + (more.freezes ?? 0),
});

export type Amounts = { coins?: number; crystals?: number; freezes?: number };

/** "15 Lunar Coins, 1 Crystal", skipping whatever is zero: what screen readers hear for a reward. */
export function currencyText(r: Amounts): string {
  const parts: string[] = [];
  if (r.coins) parts.push(plural(r.coins, "Lunar Coin"));
  if (r.crystals) parts.push(plural(r.crystals, "Crystal"));
  if (r.freezes) parts.push(plural(r.freezes, "Streak Shield"));
  return parts.join(", ");
}

// ---- reward toasts: small, passing moments. A promotion is bigger and keeps its full-screen modal. ----

export type RewardKind = "quest" | "streak" | "achievement";
/** `icon` fills the toast's left slot; `amounts` are shown as currency chips under the detail. */
export type RewardDraft = { kind: RewardKind; icon: IconName; title: string; detail?: string; amounts?: Amounts };
export type Reward = RewardDraft & { id: number };

export const REWARD_KICKER: Record<RewardKind, string> = {
    quest: "Mission complete",
  streak: "Orbit milestone",
  achievement: "Achievement unlocked",
};

export const achievementReward = (d: AchievementDef, amounts: Amounts): RewardDraft => ({ kind: "achievement", icon: d.icon, title: d.name, detail: d.description, amounts });

/** Several unlocked at once (the first check after this shipped): one toast instead of a pile. */
export const achievementsReward = (count: number, amounts: Amounts): RewardDraft => ({
  kind: "achievement",
  icon: "star-filled",
  title: `${count} achievements`,
  detail: "See them all on your profile.",
  amounts,
});

export const questReward = (q: QuestDef): RewardDraft => ({ kind: "quest", icon: "target", title: q.name, detail: "Claim it:", amounts: q });

export const streakReward = (days: number, r: { coins: number; crystals: number; freezes: number }): RewardDraft => ({
  kind: "streak",
  icon: "orbit",
  title: `${days}-day orbit!`,
  amounts: r,
});
