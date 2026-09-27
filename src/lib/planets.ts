// Dependency-free so scripts can load it directly.

export type PlanetId = "earth" | "aurelia" | "mars" | "venus" | "jupiter" | "saturn" | "uranus" | "neptune" | "virelia" | "zenith";
export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Planet = {
  id: PlanetId;
  name: string;
  pt: string;
  /** Fallback glyph for places an emoji is simpler than a rendered orb (e.g. plain-text lists). */
  emoji: string;
  /** Sphere shading for the rendered planet orb: [highlight, shadow]. */
  color: [string, string];
  /** Saturn-only: draw a ring around the orb. */
  ring?: boolean;
  topic: string;
  cefr: Cefr;
  /** Index into TITLES: the rank at which this course counts toward the rank-based CEFR baseline. */
  minRank: number;
};

// Journey order: nearest to the Sun first, the invented planets at the end — the same order as
// the course stops in bodies.ts. The journey is one main mission: each stop opens once the one
// before it is finished (see planetStats.ts). `minRank` no longer gates anything; it only feeds the
// rank-based CEFR baseline. Courses sit so that CEFR only rises along the path (migration 0015
// moved them into this order). `color` drives the rendered orb.
export const PLANETS: Planet[] = [
  { id: "venus", name: "Venus", pt: "Vênus", emoji: "🟠", color: ["#ffd9a0", "#8a5a1e"], topic: "Greetings and introductions", cefr: "A1", minRank: 0 },
  { id: "earth", name: "Earth", pt: "Terra", emoji: "🌍", color: ["#7ec8ff", "#123a66"], topic: "Everyday basics", cefr: "A1", minRank: 1 },
  { id: "mars", name: "Mars", pt: "Marte", emoji: "🔴", color: ["#ff9d70", "#7a2410"], topic: "Food, shopping and routine", cefr: "A2", minRank: 2 },
  { id: "jupiter", name: "Jupiter", pt: "Júpiter", emoji: "🪐", color: ["#f0c98f", "#7a4f22"], topic: "Relationships and emotions", cefr: "A2", minRank: 3 },
  { id: "saturn", name: "Saturn", pt: "Saturno", emoji: "🪐", color: ["#f6e2b3", "#8a6a2a"], ring: true, topic: "Travel and transport", cefr: "B1", minRank: 4 },
  { id: "uranus", name: "Uranus", pt: "Urano", emoji: "🔵", color: ["#bdf0ea", "#2f7d78"], topic: "Work and interviews", cefr: "B1", minRank: 5 },
  { id: "neptune", name: "Neptune", pt: "Netuno", emoji: "🔵", color: ["#8fa4ff", "#1c2a6e"], topic: "Slang and informal talk", cefr: "B2", minRank: 6 },
  { id: "aurelia", name: "Aurelia", pt: "Aurélia", emoji: "🟡", color: ["#ffe08a", "#a8720a"], topic: "British accent", cefr: "B2", minRank: 7 },
  { id: "virelia", name: "Virelia", pt: "Virélia", emoji: "🟣", color: ["#d9a6ff", "#5b1f8a"], topic: "Idioms and expressions", cefr: "C1", minRank: 8 },
  { id: "zenith", name: "Zenith", pt: "Zênite", emoji: "⚪", color: ["#f5f5f5", "#8a8a8a"], topic: "Series, films and fast conversation", cefr: "C2", minRank: 9 },
];

/** Courses moved between planets by migration 0015 (old id → new id), so CEFR rises along the path. */
export const COURSE_MOVES_0015: Partial<Record<PlanetId, PlanetId>> = {
  aurelia: "venus",
  venus: "jupiter",
  jupiter: "saturn",
  saturn: "uranus",
  uranus: "neptune",
  neptune: "aurelia",
};

/** What guests may play: the first two course planets of the journey. */
export const STARTER_PLANETS = PLANETS.slice(0, 2).map((p) => p.id);

export const PLANET_BY_ID = new Map(PLANETS.map((p) => [p.id, p]));
export const isPlanetId = (v: unknown): v is PlanetId => typeof v === "string" && PLANET_BY_ID.has(v as PlanetId);

export const CEFR_LEVELS: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
