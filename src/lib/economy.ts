import { MILESTONES } from "./streak";

// ---- earning: tune here ----
export const COINS_PER_XP = 1 / 6; // Lunar Coins per XP point earned on a phrase: 1 per 6 XP
export const CRYSTALS_PER_RANK_UP = 5;
export const CRYSTALS_PER_CEFR_UP = 10;

const MILESTONE_REWARD: Record<number, { coins: number; crystals: number; freezes: number }> = {
  7: { coins: 20, crystals: 5, freezes: 1 },
  30: { coins: 100, crystals: 20, freezes: 1 },
  100: { coins: 300, crystals: 60, freezes: 2 },
  365: { coins: 1000, crystals: 250, freezes: 3 },
};
export const milestoneReward = (days: number) => MILESTONE_REWARD[days] ?? { coins: 0, crystals: 0, freezes: 0 };

export const coinsForXp = (xp: number) => Math.round(xp * COINS_PER_XP);

// ---- interest: a small daily bonus for a long streak, capped so a big balance can't snowball ----
// "Juros de estudo": needs real dedication before it pays anything, and never much.
export const INTEREST_TIERS = [
  { minStreak: 14, rate: 0.005 },
  { minStreak: 30, rate: 0.01 },
  { minStreak: 100, rate: 0.02 },
  { minStreak: 365, rate: 0.03 },
] as const;
export const INTEREST_CAP_BALANCE = 5000; // interest only applies to this much of the balance

export function dailyInterest(streak: number, coins: number): number {
  const tier = [...INTEREST_TIERS].reverse().find((t) => streak >= t.minStreak);
  if (!tier) return 0;
  return Math.floor(tier.rate * Math.min(coins, INTEREST_CAP_BALANCE));
}

export type Wallet = { coins: number; crystals: number; freezes: number };
export const emptyWallet: Wallet = { coins: 0, crystals: 0, freezes: 0 };
