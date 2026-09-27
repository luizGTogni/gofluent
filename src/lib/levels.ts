// Free mode by level: pick a difficulty and play phrases up to its CEFR band, off the journey.
import type { Difficulty } from "./engine";
import type { Exercise } from "./exercises";
import { CEFR_LEVELS, PLANET_BY_ID, type Cefr } from "./planets";

/** The hardest CEFR band each level draws from; every level includes the bands below it. */
export const LEVEL_CEILING: Record<Difficulty, Cefr> = { easy: "A1", medium: "A2", hard: "B1", extreme: "C2" };

/** "A1", "A1–A2", …: the bands a level covers, for its label. */
export const levelBands = (d: Difficulty) => (LEVEL_CEILING[d] === "A1" ? "A1" : `A1–${LEVEL_CEILING[d]}`);

/** The phrases a level plays: those from planets whose band is at or under its ceiling. */
export function levelPool(library: readonly Exercise[], d: Difficulty): Exercise[] {
  const ceiling = CEFR_LEVELS.indexOf(LEVEL_CEILING[d]);
  return library.filter((e) => CEFR_LEVELS.indexOf(PLANET_BY_ID.get(e.planet)!.cefr) <= ceiling);
}
