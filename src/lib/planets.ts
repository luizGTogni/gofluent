// Dependency-free so scripts can load it directly.

export type PlanetId = "earth" | "aurelia" | "mars" | "venus" | "jupiter" | "saturn" | "uranus" | "neptune" | "virelia" | "zenith";
export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Planet = {
  id: PlanetId;
  name: string;
  pt: string;
  emoji: string;
  topic: string;
  cefr: Cefr;
  /** Index into TITLES: the rank needed to make a first visit. Visited planets stay open. */
  minRank: number;
};

// Display order: real planets first (roughly nearest-to-farthest), invented ones at the end.
// Each still carries its own `cefr` and `minRank`, which drive difficulty and unlocking —
// independent of where it sits in this shelf.
export const PLANETS: Planet[] = [
  { id: "earth", name: "Earth", pt: "Terra", emoji: "🌍", topic: "Everyday basics", cefr: "A1", minRank: 0 },
  { id: "mars", name: "Mars", pt: "Marte", emoji: "🔴", topic: "Food, shopping and routine", cefr: "A2", minRank: 2 },
  { id: "venus", name: "Venus", pt: "Vênus", emoji: "💗", topic: "Relationships and emotions", cefr: "A2", minRank: 3 },
  { id: "jupiter", name: "Jupiter", pt: "Júpiter", emoji: "🪐", topic: "Travel and transport", cefr: "B1", minRank: 4 },
  { id: "saturn", name: "Saturn", pt: "Saturno", emoji: "💼", topic: "Work and interviews", cefr: "B1", minRank: 5 },
  { id: "uranus", name: "Uranus", pt: "Urano", emoji: "😎", topic: "Slang and informal talk", cefr: "B2", minRank: 6 },
  { id: "neptune", name: "Neptune", pt: "Netuno", emoji: "🇬🇧", topic: "British accent", cefr: "B2", minRank: 7 },
  { id: "aurelia", name: "Aurelia", pt: "Aurélia", emoji: "🟡", topic: "Greetings and introductions", cefr: "A1", minRank: 1 },
  { id: "virelia", name: "Virelia", pt: "Virélia", emoji: "🟣", topic: "Idioms and expressions", cefr: "C1", minRank: 8 },
  { id: "zenith", name: "Zenith", pt: "Zênite", emoji: "⚪", topic: "Series, films and fast conversation", cefr: "C2", minRank: 9 },
];

export const PLANET_BY_ID = new Map(PLANETS.map((p) => [p.id, p]));
export const isPlanetId = (v: unknown): v is PlanetId => typeof v === "string" && PLANET_BY_ID.has(v as PlanetId);

export const CEFR_LEVELS: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
