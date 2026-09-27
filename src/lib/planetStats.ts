import type { Result } from "./engine";
import { CELESTIAL_PATH, type CelestialBody } from "./bodies";
import { CEFR_LEVELS, PLANET_BY_ID, PLANETS, type Cefr, type Planet, type PlanetId } from "./planets";

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

// ---- the journey as one main mission: every astro, in order, each opening once the one before
// it is finished. A stop without phrases can't be finished yet, so the journey waits there until
// its content arrives. Having played a planet before doesn't keep it open: the path is the path.

/** Solid phrases that finish a stop (all of them, if the stop has fewer). Tune here. */
export const STOP_GOAL = 10;
export const stopGoal = (count: number) => Math.min(STOP_GOAL, count);

export type PhraseCounts = Record<PlanetId, number>;

export const stopDone = (stat: PlanetStat | undefined, count: number) => count > 0 && (stat?.solid ?? 0) >= stopGoal(count);

const bodyDone = (body: CelestialBody, stats: Map<PlanetId, PlanetStat>, counts: PhraseCounts) =>
  Boolean(body.planetId) && stopDone(stats.get(body.planetId!), counts[body.planetId!] ?? 0);

/** Index into CELESTIAL_PATH of the stop you're on: the first one not finished yet. */
export function journeyIndex(stats: Map<PlanetId, PlanetStat>, counts: PhraseCounts): number {
  const i = CELESTIAL_PATH.findIndex((b) => !bodyDone(b, stats, counts));
  return i === -1 ? CELESTIAL_PATH.length - 1 : i;
}

const indexOfPlanet = (id: PlanetId) => CELESTIAL_PATH.findIndex((b) => b.planetId === id);

/** The stop right before `planet` on the journey: the one to finish before it opens. */
export const previousStop = (planet: Planet): CelestialBody | null => CELESTIAL_PATH[indexOfPlanet(planet.id) - 1] ?? null;

/** Open once every stop before it is finished. */
export const canEnter = (planet: Planet, stats: Map<PlanetId, PlanetStat>, counts: PhraseCounts): boolean =>
  indexOfPlanet(planet.id) <= journeyIndex(stats, counts);

/** The planet "Continue" plays: `preferred` if it's open and has phrases, else the stop you're on
 * if it has phrases, else null — nothing to play until the current stop gets content. */
export function continuePlanet(preferred: PlanetId, stats: Map<PlanetId, PlanetStat>, counts: PhraseCounts): PlanetId | null {
  const ok = (id: PlanetId | undefined): id is PlanetId => Boolean(id) && (counts[id!] ?? 0) > 0 && canEnter(PLANET_BY_ID.get(id!)!, stats, counts);
  if (ok(preferred)) return preferred;
  const here = CELESTIAL_PATH[journeyIndex(stats, counts)].planetId;
  return ok(here) ? here : null;
}

// ---- CEFR estimate: a band counts once there is enough evidence that most phrases go well ----
export const MIN_SAMPLE = 10;
export const PASS_RATE = 0.7;

export type Band = {
  cefr: Cefr;
  played: number;
  solid: number;
  rate: number;
  enough: boolean;
  passed: boolean;
  /** Counted as passed on rank alone — you haven't ground the phrases to prove it yet, but your
   * standing already implies it. Evidence can still overtake this once you play enough. */
  byRank: boolean;
};

/** Rank as a CEFR baseline: the highest level c such that every level up to c has at least one
 * planet at or below your rank (planets' `minRank`). Level/rank act as one signal; a
 * gamified placement test is the planned second one, still to come. */
export function rankCefrFloor(rankIndex: number): Cefr {
  let floor: Cefr = "A1";
  for (const cefr of CEFR_LEVELS) {
    if (!PLANETS.some((p) => p.cefr === cefr && p.minRank <= rankIndex)) break;
    floor = cefr;
  }
  return floor;
}

export function cefrBands(stats: Iterable<PlanetStat>, rankIndex?: number): Band[] {
  const byPlanet = new Map([...stats].map((s) => [s.planet, s]));
  const floorIdx = rankIndex !== undefined ? CEFR_LEVELS.indexOf(rankCefrFloor(rankIndex)) : -1;
  return CEFR_LEVELS.map((cefr, i) => {
    let played = 0;
    let solid = 0;
    for (const p of PLANETS) {
      if (p.cefr !== cefr) continue;
      played += byPlanet.get(p.id)?.played ?? 0;
      solid += byPlanet.get(p.id)?.solid ?? 0;
    }
    const rate = played ? solid / played : 0;
    const enough = played >= MIN_SAMPLE;
    const provenByPlay = enough && rate >= PASS_RATE;
    const byRank = !provenByPlay && i <= floorIdx;
    return { cefr, played, solid, rate, enough, passed: provenByPlay || byRank, byRank };
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
