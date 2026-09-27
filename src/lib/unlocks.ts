import type { GameMode } from "./modes";
import { TITLES } from "./titles";

export type Accent = "us" | "gb";

/** Playback speeds available from the start; going faster is what rank unlocks. */
export const BASE_SPEEDS = [0.5, 0.75, 1] as const;

// One rank index per reward. Named after the title that first grants it, so the source is easy to audit.
const speedRankOf = (rate: number) => TITLES.findIndex((t) => t.name === { 1.25: "Cadet", 1.5: "Pilot", 2: "Commander" }[rate]);
export const SPEED_UNLOCKS: { rate: number; rank: number }[] = [1.25, 1.5, 2].map((rate) => ({ rate, rank: speedRankOf(rate) }));

export const EXTENDED_RANK = TITLES.findIndex((t) => t.name === "Pilot"); // phrases longer than 6 words
export const ACCENT_RANK = TITLES.findIndex((t) => t.name === "Navigator"); // British accent preview

export const availableSpeeds = (rankIndex: number): number[] =>
  [...BASE_SPEEDS, ...SPEED_UNLOCKS.filter((u) => rankIndex >= u.rank).map((u) => u.rate)].sort((a, b) => a - b);

export const nextSpeedUnlock = (rankIndex: number) => SPEED_UNLOCKS.find((u) => rankIndex < u.rank);

export const extendedUnlocked = (rankIndex: number) => rankIndex >= EXTENDED_RANK;
export const accentUnlocked = (rankIndex: number) => rankIndex >= ACCENT_RANK;

/**
 * The level (from rank points, like the title) each Free mode opens at: the easy-going modes first,
 * the audio-only one last. Levels, not titles, so the first modes open within a few sessions.
 */
export const MODE_UNLOCKS: Record<GameMode, number> = {
  classic: 0,
  timeAttack: 5,
  survival: 8,
  boss: 11,
  blind: 16,
};

export const modeUnlocked = (mode: GameMode, level: number) => level >= MODE_UNLOCKS[mode];
