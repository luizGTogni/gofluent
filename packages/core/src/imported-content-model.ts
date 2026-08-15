/**
 * "Learn From Anything" ingestion record (ROADMAP Phase 5, DATABASE.md §7
 * future `ImportedContent`, ARCHITECTURE.md §93 pipeline). Holds the
 * learner-supplied raw source text and its deterministic lexical analysis;
 * the generated lesson itself (comprehension questions, vocabulary notes)
 * lands in a regular `Content` row (`contentType: "IMPORTED_TEXT"`) that
 * this record points to — no parallel content system.
 */
export interface ImportedContent {
  id: string;
  learnerId: string;
  contentId?: string | undefined;
  title?: string | undefined;
  rawText: string;
  language: string;
  estimatedDifficulty?: number | undefined;
  knownRatio?: number | undefined;
  unknownRatio?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ImportedContentRepository {
  get(id: string): ImportedContent | null;
  upsert(record: ImportedContent): void;
  listByLearner(learnerId: string, limit: number): ImportedContent[];
}
