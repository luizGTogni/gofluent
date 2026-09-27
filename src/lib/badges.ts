// Kept dependency-free so scripts can load it directly.
import type { IconName } from "./icons";

export type BadgeId = "first_perfect" | "no_hint_100" | "early_bird" | "night_owl";

/** Sets the colour of a badge's medallion ring. */
export type Rarity = "common" | "rare" | "epic";

export type BadgeDef = { id: BadgeId; name: string; description: string; icon: IconName; rarity: Rarity };

/** "Mission badges": a handful of concrete, checkable achievements. More will follow as new
 * signals (grammar-pattern mastery, event participation) become worth badging. */
export const BADGES: BadgeDef[] = [
  { id: "first_perfect", name: "First Perfect", description: "Finish a phrase with a perfect score.", icon: "sparkles", rarity: "common" },
  { id: "no_hint_100", name: "No Hints, 100 Phrases", description: "Complete 100 phrases across all time without using a hint.", icon: "bulb-off", rarity: "epic" },
  { id: "early_bird", name: "Early Bird", description: "Practice before 7am.", icon: "sunrise", rarity: "rare" },
  { id: "night_owl", name: "Night Owl", description: "Practice after 11pm.", icon: "moon", rarity: "rare" },
];

export const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));
