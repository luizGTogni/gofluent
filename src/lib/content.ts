import { EXERCISES, type Exercise, type Pos } from "./exercises";
import { getPublicClient } from "./supabase";

const POS: ReadonlySet<string> = new Set<Pos>(["noun", "verb", "numeral", "pronoun", "adjective", "adverb", "article", "determiner", "preposition"]);

type Row = {
  text: string;
  translation: string;
  phrase_words: { word_index: number; words: { text: string; ipa: string; pos: string } | null }[];
};

const shuffle = <T,>(list: T[]): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** A session of `n` exercises: a few single words, some phrases, mostly sentences, easiest first. */
export function pickSession(pool: Exercise[], n = 10): Exercise[] {
  const size = (e: Exercise) => e.words.length;
  const groups = [pool.filter((e) => size(e) === 1), pool.filter((e) => size(e) >= 2 && size(e) <= 3), pool.filter((e) => size(e) >= 4)];
  const quota = [Math.round(n * 0.2), Math.round(n * 0.3), n - Math.round(n * 0.2) - Math.round(n * 0.3)];
  const picked = groups.flatMap((g, i) => shuffle(g).slice(0, quota[i]));
  const rest = shuffle(pool.filter((e) => !picked.includes(e)));
  const chosen = [...picked, ...rest].slice(0, n);
  return chosen.sort((a, b) => size(a) - size(b));
}

const MAX_REVIEW = 4;
const MAX_PRACTICE = 2;

export type SessionPlan = { exercises: Exercise[]; review: Set<Exercise>; practice: Set<Exercise> };

/**
 * Due review phrases first (capped), then a couple of phrases that contain words the learner
 * finds tricky (word -> weight), then new content to fill the session. Easiest first.
 */
export function buildSession(pool: Exercise[], due: Exercise[], tricky: Map<string, number>, n = 10): SessionPlan {
  const review = due.slice(0, MAX_REVIEW);
  const taken = new Set(review);

  const weight = (e: Exercise) => e.words.reduce((sum, w) => sum + (tricky.get(w.text.toLowerCase()) ?? 0), 0);
  const practice = shuffle(pool.filter((e) => !taken.has(e)))
    .map((e) => ({ e, w: weight(e) }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, MAX_PRACTICE)
    .map((x) => x.e);
  practice.forEach((e) => taken.add(e));

  const fresh = pickSession(pool.filter((e) => !taken.has(e)), n - taken.size);
  const exercises = [...review, ...practice, ...fresh].sort((a, b) => a.words.length - b.words.length);
  return { exercises, review: new Set(review), practice: new Set(practice) };
}

export type Content = { exercises: Exercise[]; source: "remote" | "local" };

const local: Content = { exercises: EXERCISES, source: "local" };

/** Loads phrases from Supabase; falls back to the bundled content on any problem. */
export async function loadContent(): Promise<Content> {
  const db = getPublicClient();
  if (!db) return local;
  try {
    const { data, error } = await db
      .from("phrases")
      .select("text, translation, phrase_words(word_index, words(text, ipa, pos))")
      .order("level")
      .order("sort_order");
    if (error || !data?.length) return local;

    const exercises: Exercise[] = [];
    for (const row of data as unknown as Row[]) {
      const parts = [...row.phrase_words].sort((a, b) => a.word_index - b.word_index);
      const words = parts.map((p) => p.words);
      // Skip a phrase that is incomplete or malformed rather than break the session.
      if (!words.length || words.some((w) => !w || !POS.has(w.pos))) continue;
      exercises.push({
        words: words.map((w) => ({ text: w!.text, ipa: w!.ipa, pos: w!.pos as Pos })),
        translation: row.translation,
      });
    }
    return exercises.length ? { exercises, source: "remote" } : local;
  } catch {
    return local;
  }
}
