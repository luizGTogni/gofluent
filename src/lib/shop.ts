// Kept dependency-free so scripts can load it directly.

export const OXYGEN_COST = 40; // Lunar Coins per Oxygen Extra
export const FREEZE_COST = 80; // Lunar Coins per Streak Shield

export type SuitId = "helmet" | "patches" | "medals";

export type SuitDef = { id: SuitId; name: string; description: string; icon: string; crystals: number };

/** Spacesuit pieces: cosmetic, cumulative — each one you own shows next to your avatar in the
 * profile. Titles already carry a "vibe" (see titles.ts); this is the visual layer for it. */
export const SUITS: SuitDef[] = [
  { id: "helmet", name: "Helmet", description: "A polished visor for your spacesuit.", icon: "🪖", crystals: 5 },
  { id: "patches", name: "Mission Patches", description: "Patches from every mission you've flown.", icon: "🎖️", crystals: 8 },
  { id: "medals", name: "Medals", description: "Medals for the missions you've aced.", icon: "🏅", crystals: 12 },
];
