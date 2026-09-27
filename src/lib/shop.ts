// Kept dependency-free so scripts can load it directly.

export const OXYGEN_COST = 40; // Lunar Coins per Oxygen Extra
export const FREEZE_COST = 80; // Lunar Coins per Streak Shield

export type SuitId = "helmet" | "patches" | "medals";

export type SuitDef = { id: SuitId; name: string; description: string; icon: string; crystals: number };

/** Spacesuit pieces: cosmetic, cumulative — each one you own shows next to your avatar in the
 * profile. Titles already carry a "vibe" (see titles.ts); this is the visual layer for it. */
export const SUITS: SuitDef[] = [
  { id: "helmet", name: "Visor", description: "A polished helmet visor for your spacesuit.", icon: "🥽", crystals: 5 },
  { id: "patches", name: "Mission Patches", description: "Patches from every mission you've flown.", icon: "🎖️", crystals: 8 },
  { id: "medals", name: "Medals", description: "Medals for the missions you've aced.", icon: "🏅", crystals: 12 },
];

export type CosmeticKind = "trail" | "halo";

export type CosmeticDef = { id: string; kind: CosmeticKind; name: string; description: string; color: string; crystals: number };

/** Journey looks, bought with Crystals and worn one per kind: the colour of the trail between
 * stops, and the halo around the planet you're on. */
export const COSMETICS: CosmeticDef[] = [
  { id: "trail_aurora", kind: "trail", name: "Aurora trail", description: "Your journey's path glows green.", color: "#58d6a0", crystals: 6 },
  { id: "trail_ion", kind: "trail", name: "Ion trail", description: "An electric blue path between stops.", color: "#6fc8ff", crystals: 6 },
  { id: "trail_nebula", kind: "trail", name: "Nebula trail", description: "A violet haze behind your rocket.", color: "#b889ff", crystals: 6 },
  { id: "halo_ice", kind: "halo", name: "Ice halo", description: "A frosty ring around the planet you're on.", color: "#9fd8ff", crystals: 10 },
  { id: "halo_ember", kind: "halo", name: "Ember halo", description: "A glowing ember ring around your planet.", color: "#ff8a5c", crystals: 10 },
  { id: "halo_void", kind: "halo", name: "Void halo", description: "A deep violet ring around your planet.", color: "#b889ff", crystals: 10 },
];

export const COSMETIC_BY_ID = new Map(COSMETICS.map((c) => [c.id, c]));

export const COSMETIC_KIND_LABEL: Record<CosmeticKind, string> = { trail: "Rocket trails", halo: "Orb halos" };
