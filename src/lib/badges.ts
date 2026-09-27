// Kept dependency-free so scripts can load it directly.

export type BadgeId = "first_perfect" | "no_hint_100" | "early_bird" | "night_owl";

export type BadgeDef = { id: BadgeId; name: string; description: string; icon: string };

/** "Mission badges": a handful of concrete, checkable achievements. More will follow as new
 * signals (grammar-pattern mastery, event participation) become worth badging. */
export const BADGES: BadgeDef[] = [
  { id: "first_perfect", name: "First Perfect", description: "Finish a phrase with a perfect score.", icon: "🌟" },
  { id: "no_hint_100", name: "No Hints, 100 Phrases", description: "Complete 100 phrases across all time without using a hint.", icon: "💪" },
  { id: "early_bird", name: "Early Bird", description: "Practice before 7am.", icon: "🌅" },
  { id: "night_owl", name: "Night Owl", description: "Practice after 11pm.", icon: "🦉" },
];

export const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));
