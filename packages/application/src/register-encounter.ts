import { emptyLearnerItemState, type Encounter, type LearnerLexemeState, type ReviewItem } from "@gofluent/core";
import { updateMastery, scheduleReview } from "@gofluent/learning-engine";
import { createId } from "@gofluent/shared";
import { SqliteEncounterRepository, SqliteLearnerLexemeStateRepository, SqliteReviewRepository, type DatabaseSync } from "@gofluent/db";

export interface RegisterEncounterInput { encounter: Encounter; learningValue: number; now?: Date; }
export interface RegisterEncounterResult { state: LearnerLexemeState; review: ReviewItem; }

/** Keeps the append-only event, derived state, and review queue atomically consistent. */
export function registerLexemeEncounter(db: DatabaseSync, input: RegisterEncounterInput): RegisterEncounterResult {
  if (input.encounter.itemType !== "LEXEME") throw new Error("registerLexemeEncounter requires a LEXEME encounter");
  const encounters = new SqliteEncounterRepository(db);
  const states = new SqliteLearnerLexemeStateRepository(db);
  const reviews = new SqliteReviewRepository(db);
  const now = input.now ?? new Date(input.encounter.createdAt);
  let result: RegisterEncounterResult | undefined;
  db.exec("BEGIN");
  try {
    const base = states.get(input.encounter.learnerId, input.encounter.itemId) ?? {
      ...emptyLearnerItemState(input.encounter.learnerId, input.encounter.itemId, input.encounter.createdAt),
      lexemeId: input.encounter.itemId,
    };
    const state = updateMastery(base, input.encounter);
    const schedule = scheduleReview({ state, learningValue: input.learningValue, result: input.encounter.result, now });
    state.nextReviewAt = schedule.nextReviewAt;
    const review: ReviewItem = { id: createId(), learnerId: state.learnerId, itemType: "LEXEME", itemId: state.lexemeId,
      dueAt: schedule.nextReviewAt, priority: schedule.priority, lastResult: input.encounter.result, schedulingVersion: "v1",
      createdAt: input.encounter.createdAt, updatedAt: input.encounter.createdAt };
    encounters.append(input.encounter);
    states.upsert(state);
    reviews.upsert(review);
    db.exec("COMMIT");
    result = { state, review };
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
  return result;
}
