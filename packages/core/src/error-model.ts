/**
 * Recurring learner-production error patterns (DATABASE.md §49-51 `learner_errors`,
 * ARCHITECTURE.md §53-54 Error Memory Architecture). Aggregated by normalized
 * pattern rather than stored per-wording (PRD §25).
 */
import type { ErrorCategory } from "./enums.js";

export interface LearnerError {
  id: string;
  learnerId: string;
  category: ErrorCategory;
  normalizedPattern: string;
  exampleOriginal?: string | undefined;
  examplePreferred?: string | undefined;
  occurrences: number;
  severity: number;
  firstSeenAt: string;
  lastSeenAt: string;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerErrorRepository {
  findByPattern(learnerId: string, category: ErrorCategory, normalizedPattern: string): LearnerError | null;
  upsert(error: LearnerError): void;
  listRecent(learnerId: string, limit: number): LearnerError[];
}
