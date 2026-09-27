export type WordStat = { word: string; seen: number; struggled: number; fails: number; listening: number; spelling: number };
export type WordOutcome = { word: string; fails: number; heard: number };

export const MIN_STRUGGLES = 2;
export const MIN_RATE = 0.5;

export const key = (word: string) => word.toLowerCase();

export const rate = (s: WordStat) => (s.seen ? s.struggled / s.seen : 0);

/** Tricky = stumbled more than once, and in a large share of the times it appeared. */
export const isTricky = (s: WordStat) => s.struggled >= MIN_STRUGGLES && rate(s) >= MIN_RATE;

/** Applies one exercise's outcome to the stats; returns only the entries that changed. */
export function applyOutcome(stats: Map<string, WordStat>, outcome: WordOutcome[]): WordStat[] {
  // A word repeated in a phrase ("the ... the") counts once, with its worst result.
  const worst = new Map<string, WordOutcome>();
  for (const o of outcome) {
    const w = worst.get(key(o.word));
    worst.set(key(o.word), { word: key(o.word), fails: Math.max(w?.fails ?? 0, o.fails), heard: Math.max(w?.heard ?? 0, o.heard) });
  }
  return [...worst.values()].map((o) => {
    const prev = stats.get(o.word) ?? { word: o.word, seen: 0, struggled: 0, fails: 0, listening: 0, spelling: 0 };
    return {
      word: o.word,
      seen: prev.seen + 1,
      struggled: prev.struggled + (o.fails > 0 ? 1 : 0),
      fails: prev.fails + o.fails,
      listening: prev.listening + (o.heard > 0 ? 1 : 0),
      spelling: prev.spelling + (o.fails - o.heard > 0 ? 1 : 0),
    };
  });
}

/** What mostly makes this word hard: not catching it in the audio, or writing it. */
export const mainCause = (s: WordStat): "listening" | "spelling" => (s.listening >= s.spelling ? "listening" : "spelling");

/** Trickiest first: by struggle rate, then total fails. */
export function trickyList(stats: Iterable<WordStat>): WordStat[] {
  return [...stats].filter(isTricky).sort((a, b) => rate(b) - rate(a) || b.fails - a.fails);
}
