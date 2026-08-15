import { emptyLearnerItemState, type Encounter, type LearnerLexemeState, type ReviewItem } from "@gofluent/core";
import { updateMastery, scheduleReview } from "@gofluent/learning-engine";
import { createId } from "@gofluent/shared";
import { SqliteEncounterRepository, SqliteLearnerLexemeStateRepository, SqliteReviewRepository, type DatabaseSync } from "@gofluent/db";

export interface RegisterEncounterInput { encounter: Encounter; learningValue: number; now?: Date; }
export interface RegisterEncounterResult { state: LearnerLexemeState; review: ReviewItem; }
export interface LexemeEncounterRepos {
  encounters: SqliteEncounterRepository;
  states: SqliteLearnerLexemeStateRepository;
  reviews: SqliteReviewRepository;
}

export function lexemeEncounterRepos(db: DatabaseSync): LexemeEncounterRepos {
  return { encounters: new SqliteEncounterRepository(db), states: new SqliteLearnerLexemeStateRepository(db), reviews: new SqliteReviewRepository(db) };
}

/**
 * Non-transactional core, reused by callers (e.g. placement, review
 * activities) that need several encounters atomically inside one
 * caller-managed BEGIN/COMMIT — SQLite does not support nested transactions.
 */
export function registerLexemeEncounterInTransaction(
  repos: LexemeEncounterRepos,
  encounter: Encounter,
  learningValue: number,
  now?: Date,
): RegisterEncounterResult {
  if (encounter.itemType !== "LEXEME") throw new Error("registerLexemeEncounterInTransaction requires a LEXEME encounter");
  const effectiveNow = now ?? new Date(encounter.createdAt);
  const base = repos.states.get(encounter.learnerId, encounter.itemId) ?? {
    ...emptyLearnerItemState(encounter.learnerId, encounter.itemId, encounter.createdAt),
    lexemeId: encounter.itemId,
  };
  const state = updateMastery(base, encounter);
  const schedule = scheduleReview({ state, learningValue, result: encounter.result, now: effectiveNow });
  state.nextReviewAt = schedule.nextReviewAt;
  const review: ReviewItem = { id: createId(), learnerId: state.learnerId, itemType: "LEXEME", itemId: state.lexemeId,
    dueAt: schedule.nextReviewAt, priority: schedule.priority, lastResult: encounter.result, schedulingVersion: "v1",
    createdAt: encounter.createdAt, updatedAt: encounter.createdAt };
  repos.encounters.append(encounter);
  repos.states.upsert(state);
  repos.reviews.upsert(review);
  return { state, review };
}

/** Keeps the append-only event, derived state, and review queue atomically consistent. */
export function registerLexemeEncounter(db: DatabaseSync, input: RegisterEncounterInput): RegisterEncounterResult {
  const repos = lexemeEncounterRepos(db);
  let result: RegisterEncounterResult | undefined;
  db.exec("BEGIN");
  try {
    result = registerLexemeEncounterInTransaction(repos, input.encounter, input.learningValue, input.now);
    db.exec("COMMIT");
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
  return result;
}
