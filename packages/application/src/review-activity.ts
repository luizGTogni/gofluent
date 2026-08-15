import type { Encounter, EncounterActivity, EncounterModality } from "@gofluent/core";
import { learningValue } from "@gofluent/lexical-engine";
import { createId } from "@gofluent/shared";
import type { DatabaseSync } from "@gofluent/db";
import { registerLexemeEncounter } from "./register-encounter.js";

/**
 * Contextual review (PRD §16) — cloze, sentence completion,
 * choose-the-natural-phrase, and typed active recall for vocabulary review,
 * all funneled through the same atomic mastery/scheduler/review-queue update
 * `registerLexemeEncounter` already provides.
 */
export interface CompleteReviewEncounterInput {
  learnerId: string;
  lexemeId: string;
  modality: EncounterModality;
  activity?: EncounterActivity;
  result: Encounter["result"];
  assistanceUsed?: boolean;
  frequencyRank?: number;
  sessionId?: string;
  contentId?: string;
  now?: Date;
}

export function completeReviewEncounter(db: DatabaseSync, input: CompleteReviewEncounterInput) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const encounter: Encounter = {
    id: createId(), learnerId: input.learnerId, itemType: "LEXEME", itemId: input.lexemeId,
    modality: input.modality, activity: input.activity ?? "REVIEW", result: input.result,
    assistanceUsed: input.assistanceUsed ?? false, contentId: input.contentId, sessionId: input.sessionId,
    createdAt: nowIso,
  };
  const value = learningValue({ ...(input.frequencyRank !== undefined ? { frequencyRank: input.frequencyRank } : {}), contextualUsefulness: 0.6, interestRelevance: 0.5, upcomingRelevance: 0.6, memoryNeed: 0.7 });
  return registerLexemeEncounter(db, { encounter, learningValue: value, now });
}
