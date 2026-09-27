import type { Result } from "./engine";
import { CEFR_LEVELS, PLANETS, type Cefr, type Planet, type PlanetId } from "./planets";
import type { Rank } from "./ranks";

export type PlanetStat = { planet: PlanetId; played: number; solid: number; enteredAt: string | null };

/** A phrase counts as solid when finished without hints and with at most one slip. */
export const isSolid = (r: Result) => !r.helped && r.typedErrors <= 1;

const blank = (planet: PlanetId): PlanetStat => ({ planet, played: 0, solid: 0, enteredAt: null });

export const recordResult = (prev: PlanetStat | undefined, planet: PlanetId, solid: boolean): PlanetStat => {
  const p = prev ?? blank(planet);
  return { ...p, played: p.played + 1, solid: p.solid + (solid ? 1 : 0) };
};

export const markEntered = (prev: PlanetStat | undefined, planet: PlanetId, now: Date): PlanetStat => {
  const p = prev ?? blank(planet);
  return p.enteredAt ? p : { ...p, enteredAt: now.toISOString() };
};

/** First visit needs the planet's rank; a planet already visited stays open even if the rank fades. */
export const canEnter = (planet: Planet, rank: Rank, stat: PlanetStat | undefined) => Boolean(stat?.enteredAt) || rank.index >= planet.minRank;

// ---- CEFR estimate: a band counts once there is enough evidence that most phrases go well ----
export const MIN_SAMPLE = 10;
export const PASS_RATE = 0.7;

export type Band = { cefr: Cefr; played: number; solid: number; rate: number; enough: boolean; passed: boolean };

export function cefrBands(stats: Iterable<PlanetStat>): Band[] {
  const byPlanet = new Map([...stats].map((s) => [s.planet, s]));
  return CEFR_LEVELS.map((cefr) => {
    let played = 0;
    let solid = 0;
    for (const p of PLANETS) {
      if (p.cefr !== cefr) continue;
      played += byPlanet.get(p.id)?.played ?? 0;
      solid += byPlanet.get(p.id)?.solid ?? 0;
    }
    const rate = played ? solid / played : 0;
    const enough = played >= MIN_SAMPLE;
    return { cefr, played, solid, rate, enough, passed: enough && rate >= PASS_RATE };
  });
}

/** Highest band reached in an unbroken run from A1, or null while there is not enough data yet. */
export function cefrEstimate(bands: Band[]): Cefr | null {
  let level: Cefr | null = null;
  for (const b of bands) {
    if (!b.passed) break;
    level = b.cefr;
  }
  return level;
}
