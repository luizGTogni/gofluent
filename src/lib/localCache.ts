// The device cache every store reads and the ledger writes: the last known state, so the app opens
// offline and without Supabase. On a signed-in device it only ever mirrors what the server returned.

export const KEYS = {
  wallet: "gofluent:wallet",
  player: "gofluent:player:v2",
  /** Player cached before the level curve changed; read once by playerStore and converted. */
  playerV1: "gofluent:player",
  planets: "gofluent:planets",
  studyDays: "gofluent:studydays",
  frozenDays: "gofluent:frozendays",
  dayVolume: "gofluent:dayvolume",
  quests: "gofluent:quests",
  oxygen: "gofluent:oxygen",
  badges: "gofluent:badges",
  noHint: "gofluent:noHintCount",
} as const;

export const readJson = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};
