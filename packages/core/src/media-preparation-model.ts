/**
 * Media Preparation (ROADMAP Phase 7, RESEARCH.md §32-33 "Netflix Difficulty
 * for You" / "Pre-Immersion", DATABASE.md §7 future `MediaPreparation`).
 * Learner supplies a title + a permitted transcript/subtitle excerpt for
 * media they plan to consume; the system mines the highest-value vocabulary
 * so it can be taught before the learner watches/listens/reads the real
 * thing. Fully deterministic — no LLM call is needed to select the words.
 */
export interface MediaPreparation {
  id: string;
  learnerId: string;
  title: string;
  transcriptExcerpt: string;
  language: string;
  estimatedComprehension: number;
  highValueLexemeIds: string[];
  preparedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaPreparationRepository {
  get(id: string): MediaPreparation | null;
  upsert(preparation: MediaPreparation): void;
  listByLearner(learnerId: string, limit: number): MediaPreparation[];
}
