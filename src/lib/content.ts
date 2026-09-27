import { EXERCISES, type Exercise, type Pos } from "./exercises";
import { getPublicClient } from "./supabase";

const POS: ReadonlySet<string> = new Set<Pos>(["noun", "verb", "numeral", "pronoun", "adjective", "adverb", "article", "preposition"]);

type Row = {
  text: string;
  translation: string;
  phrase_words: { word_index: number; words: { text: string; ipa: string; pos: string } | null }[];
};

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
