// What a session earns, and the celebratory moments it produces. Kept pure: Session owns the state.
import type { BadgeDef, BadgeId } from "./badges";
import type { QuestDef } from "./quests";

/**
 * One reward hierarchy, everywhere: XP is progress (always shown first), Lunar Coins are for
 * spending, Crystals are rare. Streak Shields ride along with the currencies.
 */
export type SessionGains = { xp: number; coins: number; crystals: number; freezes: number; badges: BadgeId[] };
export const emptyGains: SessionGains = { xp: 0, coins: 0, crystals: 0, freezes: 0, badges: [] };

export const addGains = (g: SessionGains, more: Partial<SessionGains>): SessionGains => ({
  xp: g.xp + (more.xp ?? 0),
  coins: g.coins + (more.coins ?? 0),
  crystals: g.crystals + (more.crystals ?? 0),
  freezes: g.freezes + (more.freezes ?? 0),
  badges: [...g.badges, ...(more.badges ?? [])],
});

/** "🪙 +15 · 💎 +1 · 🛡️ +1", skipping whatever is zero. */
export function currencyLine(r: { coins?: number; crystals?: number; freezes?: number }): string {
  const parts: string[] = [];
  if (r.coins) parts.push(`🪙 +${r.coins}`);
  if (r.crystals) parts.push(`💎 +${r.crystals}`);
  if (r.freezes) parts.push(`🛡️ +${r.freezes}`);
  return parts.join(" · ");
}

// ---- reward toasts: small, passing moments. A promotion is bigger and keeps its full-screen modal. ----

export type RewardKind = "badge" | "quest" | "streak";
export type RewardDraft = { kind: RewardKind; icon: string; title: string; detail?: string };
export type Reward = RewardDraft & { id: number };

export const REWARD_KICKER: Record<RewardKind, string> = {
  badge: "Badge unlocked",
  quest: "Mission complete",
  streak: "Orbit milestone",
};

export const badgeReward = (b: BadgeDef): RewardDraft => ({ kind: "badge", icon: b.icon, title: b.name, detail: b.description });

export const questReward = (q: QuestDef): RewardDraft => ({ kind: "quest", icon: "🎯", title: q.name, detail: `Claim it: ${currencyLine(q)}` });

export const streakReward = (days: number, r: { coins: number; crystals: number; freezes: number }): RewardDraft => ({
  kind: "streak",
  icon: "🛰️",
  title: `${days}-day orbit!`,
  detail: currencyLine(r),
});
