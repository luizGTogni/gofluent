import { analyzeImportedText, type ExistingLexemeInfo, type VocabularyCandidate } from "./imported-content-analysis.js";

/**
 * Media Preparation / "Netflix Difficulty for You" (ROADMAP Phase 7,
 * RESEARCH.md §32-33). Deterministic reuse of the Phase 5 lexical-analysis
 * engine (`analyzeImportedText`) — no LLM call needed to pick which words to
 * teach before the learner watches/listens/reads the real media
 * (ARCHITECTURE.md-style "no parallel system" reuse).
 */
export interface PrepareMediaInput {
  title: string;
  transcriptExcerpt: string;
  knownLemmas: string[];
  existingLexemes: Map<string, ExistingLexemeInfo>;
  /** RESEARCH.md §33 suggests 20-40 high-impact items; default is smaller given the MVP's tiny seed dataset. */
  maxHighValueItems?: number;
}

export interface PrepareMediaResult {
  title: string;
  estimatedComprehension: number;
  tokenCount: number;
  highValueItems: VocabularyCandidate[];
  /** Rough "PREPARE ME — N MIN" estimate (RESEARCH.md §32), at a flashcard-drill pace. */
  estimatedPrepMinutes: number;
}

const DEFAULT_MAX_HIGH_VALUE_ITEMS = 20;
const ITEMS_PER_MINUTE = 4;

export function prepareMedia(input: PrepareMediaInput): PrepareMediaResult {
  const analysis = analyzeImportedText({
    text: input.transcriptExcerpt,
    knownLemmas: input.knownLemmas,
    existingLexemes: input.existingLexemes,
    maxCandidates: input.maxHighValueItems ?? DEFAULT_MAX_HIGH_VALUE_ITEMS,
  });

  return {
    title: input.title,
    estimatedComprehension: 1 - analysis.coverage.unknownRatio,
    tokenCount: analysis.tokenCount,
    highValueItems: analysis.candidates,
    estimatedPrepMinutes: analysis.candidates.length === 0 ? 0 : Math.max(1, Math.ceil(analysis.candidates.length / ITEMS_PER_MINUTE)),
  };
}
