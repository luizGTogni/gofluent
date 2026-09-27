// Server-only: a first guess at each new word's part of speech, from how it's used in its phrase.
// wink-pos-tagger reads the sentence (Penn Treebank tags); this maps its tags onto the app's
// classes, following the conventions of the existing dictionary (src/lib/exercises.ts): "my" is a
// determiner, "to" a preposition, "please" and "up" adverbs. The admin still checks every guess.
import posTagger from "wink-pos-tagger";
import type { Pos } from "./exercises";

const tagger = posTagger();

/** Words whose class the app fixes regardless of the tagger. */
const FIXED: Record<string, Pos> = {
  a: "article",
  an: "article",
  the: "article",
  please: "adverb",
  hello: "interjection",
  hi: "interjection",
  bye: "interjection",
  goodbye: "interjection",
  thanks: "interjection",
  wow: "interjection",
  oops: "interjection",
  yes: "interjection",
  okay: "interjection",
  ok: "interjection",
};

/** Subordinating words the tagger calls IN (like prepositions) that the app files as conjunctions. */
const CONJUNCTIONS = new Set(["because", "if", "although", "though", "while", "since", "unless", "whether", "that", "so", "than", "until", "once"]);
/** After these, a past participle ("I am tired", "she looks bored") reads as an adjective. */
const LINKING = new Set(["am", "is", "are", "was", "were", "be", "been", "being", "feel", "feels", "felt", "look", "looks", "looked", "seem", "seems", "get", "gets", "got", "'m", "'re", "'s"]);

function fromPenn(tag: string, word: string, previous: string | undefined): Pos | null {
  if (tag.startsWith("NN")) return "noun";
  if (tag === "VBN" && previous && LINKING.has(previous)) return "adjective";
  if (tag.startsWith("VB") || tag === "MD") return "verb";
  if (tag.startsWith("JJ")) return "adjective";
  if (tag.startsWith("RB") || tag === "WRB" || tag === "RP" || tag === "EX") return "adverb";
  if (tag === "PRP$") return "determiner";
  if (tag === "PRP" || tag === "WP" || tag === "WP$") return "pronoun";
  if (tag === "WDT") return word === "that" || word === "which" ? "pronoun" : "determiner";
  if (tag === "DT" || tag === "PDT") return "determiner";
  if (tag === "CD") return "numeral";
  if (tag === "CC") return "conjunction";
  if (tag === "IN") return CONJUNCTIONS.has(word) ? "conjunction" : "preposition";
  if (tag === "TO") return "preposition";
  if (tag === "UH") return "interjection";
  return null;
}

/**
 * The part of speech of `word` as used in `sentence` (or on its own when the sentence doesn't hold
 * it), or null when there's no good guess.
 */
export function guessPos(word: string, sentence?: string): Pos | null {
  const w = word.toLowerCase();
  if (FIXED[w]) return FIXED[w];
  const tokens = tagger.tagSentence(sentence ?? word).filter((t) => t.tag === "word");
  const i = tokens.findIndex((t) => t.value.toLowerCase() === w);
  if (i === -1) return sentence ? guessPos(word) : null;
  return fromPenn(tokens[i].pos, w, tokens[i - 1]?.value.toLowerCase());
}
