import { learningValue } from "@gofluent/lexical-engine";
import { tokenizeLemmas } from "./story-generation.js";

/**
 * Deterministic half of the "Learn From Anything" pipeline (ROADMAP Phase 5,
 * ARCHITECTURE.md §93): parse → lexical analysis → difficulty estimate →
 * high-value vocabulary extraction. No LLM calls here — only
 * `imported-lesson-generation.ts` (the generative edge) touches a provider.
 */
export interface ExistingLexemeInfo { id: string; frequencyRank?: number | undefined; }

export interface AnalyzeImportedTextInput {
  text: string;
  /** Lowercase lemmas the learner already has state for — "known" for this analysis. */
  knownLemmas: string[];
  /** Lowercase lemma -> existing dataset entry, so re-mined words are linked instead of duplicated. */
  existingLexemes: Map<string, ExistingLexemeInfo>;
  maxCandidates?: number;
}

export interface ImportedTextCoverage { knownRatio: number; unknownRatio: number; }

export interface VocabularyCandidate {
  lemma: string;
  occurrences: number;
  learningValue: number;
  existingLexemeId?: string | undefined;
}

export interface AnalyzeImportedTextResult {
  tokenCount: number;
  coverage: ImportedTextCoverage;
  /** unknownRatio-driven 0..1 estimate; higher means harder for this learner (DATABASE.md §68). */
  estimatedDifficulty: number;
  /** Top unknown lemmas by learning value, highest first (PRD/ARCHITECTURE.md §93 "high-value vocabulary extraction"). */
  candidates: VocabularyCandidate[];
}

const DEFAULT_MAX_CANDIDATES = 10;

export function analyzeImportedText(input: AnalyzeImportedTextInput): AnalyzeImportedTextResult {
  const known = new Set(input.knownLemmas.map((l) => l.toLowerCase()));
  const tokens = tokenizeLemmas(input.text);

  const occurrencesByLemma = new Map<string, number>();
  let knownCount = 0;
  let unknownCount = 0;
  for (const token of tokens) {
    if (known.has(token)) {
      knownCount += 1;
      continue;
    }
    unknownCount += 1;
    occurrencesByLemma.set(token, (occurrencesByLemma.get(token) ?? 0) + 1);
  }

  const total = knownCount + unknownCount;
  const coverage: ImportedTextCoverage = total === 0
    ? { knownRatio: 0, unknownRatio: 0 }
    : { knownRatio: knownCount / total, unknownRatio: unknownCount / total };

  const candidates: VocabularyCandidate[] = [...occurrencesByLemma.entries()]
    .map(([lemma, occurrences]) => {
      const existing = input.existingLexemes.get(lemma);
      const value = learningValue({
        ...(existing?.frequencyRank !== undefined ? { frequencyRank: existing.frequencyRank } : {}),
        contextualUsefulness: 0.6,
        interestRelevance: 0.5,
        upcomingRelevance: 0.5,
        memoryNeed: Math.min(1, 0.3 + occurrences * 0.1),
      });
      return { lemma, occurrences, learningValue: value, existingLexemeId: existing?.id };
    })
    .sort((a, b) => b.learningValue - a.learningValue || b.occurrences - a.occurrences)
    .slice(0, input.maxCandidates ?? DEFAULT_MAX_CANDIDATES);

  return {
    tokenCount: tokens.length,
    coverage,
    estimatedDifficulty: coverage.unknownRatio,
    candidates,
  };
}
