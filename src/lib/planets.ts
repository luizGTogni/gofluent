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
  /** Index into TITLES: the rank needed to make a first visit. Visited planets stay open. */
  minRank: number;
};

// Display order: real planets first (roughly nearest-to-farthest), invented ones at the end.
// Each still carries its own `cefr` and `minRank`, which drive difficulty and unlocking —
// independent of where it sits in this shelf. `color` drives the rendered orb so every planet
// reads as the same kind of object (a sphere), not a grab-bag of unrelated emoji.
export const PLANETS: Planet[] = [
  { id: "earth", name: "Earth", pt: "Terra", emoji: "🌍", color: ["#7ec8ff", "#123a66"], topic: "Everyday basics", cefr: "A1", minRank: 0 },
  { id: "mars", name: "Mars", pt: "Marte", emoji: "🔴", color: ["#ff9d70", "#7a2410"], topic: "Food, shopping and routine", cefr: "A2", minRank: 2 },
  { id: "venus", name: "Venus", pt: "Vênus", emoji: "🟠", color: ["#ffd9a0", "#8a5a1e"], topic: "Relationships and emotions", cefr: "A2", minRank: 3 },
  { id: "jupiter", name: "Jupiter", pt: "Júpiter", emoji: "🪐", color: ["#f0c98f", "#7a4f22"], topic: "Travel and transport", cefr: "B1", minRank: 4 },
  {
    id: "saturn",
    name: "Saturn",
    pt: "Saturno",
    emoji: "🪐",
    color: ["#f6e2b3", "#8a6a2a"],
    ring: true,
    topic: "Work and interviews",
    cefr: "B1",
    minRank: 5,
  },
  { id: "uranus", name: "Uranus", pt: "Urano", emoji: "🔵", color: ["#bdf0ea", "#2f7d78"], topic: "Slang and informal talk", cefr: "B2", minRank: 6 },
  { id: "neptune", name: "Neptune", pt: "Netuno", emoji: "🔵", color: ["#8fa4ff", "#1c2a6e"], topic: "British accent", cefr: "B2", minRank: 7 },
  {
    id: "aurelia",
    name: "Aurelia",
    pt: "Aurélia",
    emoji: "🟡",
    color: ["#ffe08a", "#a8720a"],
    topic: "Greetings and introductions",
    cefr: "A1",
    minRank: 1,
  },
  { id: "virelia", name: "Virelia", pt: "Virélia", emoji: "🟣", color: ["#d9a6ff", "#5b1f8a"], topic: "Idioms and expressions", cefr: "C1", minRank: 8 },
  {
    id: "zenith",
    name: "Zenith",
    pt: "Zênite",
    emoji: "⚪",
    color: ["#f5f5f5", "#8a8a8a"],
    topic: "Series, films and fast conversation",
    cefr: "C2",
    minRank: 9,
  },
];

export const PLANET_BY_ID = new Map(PLANETS.map((p) => [p.id, p]));
export const isPlanetId = (v: unknown): v is PlanetId => typeof v === "string" && PLANET_BY_ID.has(v as PlanetId);

export const CEFR_LEVELS: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
