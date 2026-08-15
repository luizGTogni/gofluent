import type { LexemeRepository } from "@gofluent/core";

const INITIAL_LEXEMES = [
  ["lex_be", "be", "verb", 1, "A1"], ["lex_have", "have", "verb", 2, "A1"],
  ["lex_actually", "actually", "adverb", 487, "A2"], ["lex_figure_out", "figure out", "verb", 1200, "B1"],
] as const;
export function seedInitialLexemes(repository: LexemeRepository, now: string): void {
  for (const [id, lemma, partOfSpeech, frequencyRank, cefr] of INITIAL_LEXEMES) repository.upsert({ id, language: "en", lemma, partOfSpeech, frequencyRank, cefr, forms: [lemma], createdAt: now, updatedAt: now });
}
