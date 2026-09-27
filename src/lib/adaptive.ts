import type { Difficulty } from "./engine";
import type { PlanetStat } from "./planetStats";
import { TITLES } from "./titles";

// Named after the title that first pushes the learner up a notch, so the source is easy to audit
// (mirrors the pattern in unlocks.ts). A rank alone starts the ramp; recent accuracy on the
// current planet can pull it back down (still struggling) or push it up early (breezing through).
const MEDIUM_RANK = TITLES.findIndex((t) => t.name === "Cadet");
const HARD_RANK = TITLES.findIndex((t) => t.name === "Pilot");
const ECLIPSE_RANK = TITLES.findIndex((t) => t.name === "Commander");
const MIN_SAMPLE = 5;

/** No picker for members: the level that best matches how the last few phrases on this planet went. */
export function pickDifficulty(rankIndex: number, stat: PlanetStat | undefined): Difficulty {
  const solidRate = stat && stat.played >= MIN_SAMPLE ? stat.solid / stat.played : null;
  const struggling = solidRate !== null && solidRate < 0.5;
  const breezing = solidRate !== null && solidRate >= 0.9;

  if (rankIndex < MEDIUM_RANK || struggling) return "easy";
  if (rankIndex < HARD_RANK || (solidRate !== null && solidRate < 0.75 && !breezing)) return "medium";
  if (rankIndex < ECLIPSE_RANK || (solidRate !== null && solidRate < 0.9)) return "hard";
  return breezing || rankIndex >= ECLIPSE_RANK ? "extreme" : "hard";
}
