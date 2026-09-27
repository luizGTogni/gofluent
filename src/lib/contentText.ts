// Turning typed or generated text into phrases the game can play: one space-separated token per
// dictionary word, no punctuation. Shared by the admin screen and its API routes.
import type { Pos } from "./exercises";
import type { PlanetId } from "./planets";

export const POS_LIST: Pos[] = ["noun", "verb", "numeral", "pronoun", "adjective", "adverb", "article", "determiner", "preposition", "conjunction", "interjection"];

/** Longest phrase allowed. The game plays up to 6 words, 7-9 once "extended" phrases unlock. */
export const MAX_WORDS = 9;
/** Phrases each planet should reach. */
export const PLANET_TARGET = 200;

const WORD = /^[A-Za-z']+$/;

/** "Hello, I'm fine!" → ["Hello", "I'm", "fine"]. Tokens with anything but letters are kept to be flagged. */
export function tokenize(text: string): string[] {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:"“”()…]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export type DraftCheck = { tokens: string[]; errors: string[] };

/**
 * What's wrong with a draft, if anything. `isDuplicate` says whether the joined text already exists
 * (in the database or earlier in the batch).
 */
export function checkDraft(en: string, pt: string, isDuplicate: (text: string) => boolean): DraftCheck {
  const tokens = tokenize(en);
  const errors: string[] = [];
  if (!tokens.length) errors.push("empty phrase");
  if (tokens.length > MAX_WORDS) errors.push(`more than ${MAX_WORDS} words`);
  const bad = tokens.filter((t) => !WORD.test(t));
  if (bad.length) errors.push(`letters only: ${bad.join(", ")}`);
  if (!pt.trim()) errors.push("missing translation");
  if (tokens.length && isDuplicate(tokens.join(" ").toLowerCase())) errors.push("already exists");
  return { tokens, errors };
}

/** The form a new word is stored in: lowercase at the start of a sentence, unless it's "I". */
export const newWordText = (token: string, index: number) => (index === 0 && token !== "I" ? token.toLowerCase() : token);

export type DraftPhrase = { key: string; en: string; pt: string; planet: PlanetId };

/** One line per phrase: "english | portuguese", tab or ";" also work, optional third column planet. */
export function parseList(text: string, planet: PlanetId, isPlanet: (v: string) => v is PlanetId): DraftPhrase[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line, i) => {
      const [en = "", pt = "", p = ""] = line.split(/\s*[|\t;]\s*/);
      return { key: `list-${Date.now()}-${i}`, en, pt, planet: isPlanet(p.trim().toLowerCase()) ? (p.trim().toLowerCase() as PlanetId) : planet };
    });
}
