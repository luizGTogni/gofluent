import type { ErrorCategory, LearnerError } from "@gofluent/core";
import { createId } from "@gofluent/shared";
import { SqliteLearnerErrorRepository, type DatabaseSync } from "@gofluent/db";
import type { RecentErrorSummary } from "@gofluent/content-engine";

/**
 * Error Memory (PRD §25, DATABASE.md §49-51, ARCHITECTURE.md §53-54).
 * Recurring errors are aggregated by (learner, category, normalizedPattern)
 * rather than one row per wording variation — the unique index in
 * `0003_learner_errors.sql` is the source of truth for "is this the same
 * pattern"; this module just increments/creates on top of it.
 */
export interface RecordLearnerErrorInput {
  learnerId: string;
  category: ErrorCategory;
  normalizedPattern: string;
  exampleOriginal?: string | undefined;
  examplePreferred?: string | undefined;
  now?: Date;
}

const SEVERITY_STEP = 0.1;

export function recordLearnerErrorInTransaction(
  repo: SqliteLearnerErrorRepository,
  input: RecordLearnerErrorInput,
): LearnerError {
  const nowIso = (input.now ?? new Date()).toISOString();
  const existing = repo.findByPattern(input.learnerId, input.category, input.normalizedPattern);

  const next: LearnerError = existing
    ? {
        ...existing,
        occurrences: existing.occurrences + 1,
        severity: Math.min(1, existing.severity + SEVERITY_STEP),
        exampleOriginal: input.exampleOriginal ?? existing.exampleOriginal,
        examplePreferred: input.examplePreferred ?? existing.examplePreferred,
        lastSeenAt: nowIso,
        updatedAt: nowIso,
      }
    : {
        id: createId(),
        learnerId: input.learnerId,
        category: input.category,
        normalizedPattern: input.normalizedPattern,
        exampleOriginal: input.exampleOriginal,
        examplePreferred: input.examplePreferred,
        occurrences: 1,
        severity: 0.5,
        firstSeenAt: nowIso,
        lastSeenAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

  repo.upsert(next);
  return next;
}

export function recordLearnerError(db: DatabaseSync, input: RecordLearnerErrorInput): LearnerError {
  const repo = new SqliteLearnerErrorRepository(db);
  let result: LearnerError | undefined;
  db.exec("BEGIN");
  try {
    result = recordLearnerErrorInTransaction(repo, input);
    db.exec("COMMIT");
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
  return result;
}

/** Feeds Speak Mode's conversation context (PRD §23 "recent recurring errors"). */
export function recentErrorSummaries(db: DatabaseSync, learnerId: string, limit = 5): RecentErrorSummary[] {
  const repo = new SqliteLearnerErrorRepository(db);
  return repo.listRecent(learnerId, limit).map((error) => ({
    category: error.category,
    normalizedPattern: error.normalizedPattern,
    examplePreferred: error.examplePreferred,
  }));
}
