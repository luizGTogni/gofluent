import { prepareMedia, type VocabularyCandidate } from "@gofluent/content-engine";
import type { EncounterResult, MediaPreparation } from "@gofluent/core";
import { createId } from "@gofluent/shared";
import {
  SqliteLearnerLexemeStateRepository, SqliteLexemeRepository, SqliteMediaPreparationRepository, type DatabaseSync,
} from "@gofluent/db";
import { lexemeEncounterRepos, registerLexemeEncounterInTransaction } from "./register-encounter.js";

/**
 * Media Preparation / "Prepare Me" (ROADMAP Phase 7, RESEARCH.md §32-33).
 * Fully deterministic — `prepareMedia` (content-engine) needs no LLM call to
 * pick which words matter most; mined vocabulary that isn't already in the
 * lexical dataset becomes new `Lexeme` rows, same as Learn From Anything
 * (Phase 5) — no parallel vocabulary-mining path.
 */
const DEFAULT_MAX_HIGH_VALUE_ITEMS = 20;

export interface PrepareMediaForLearnerInput {
  learnerId: string;
  language: string;
  title: string;
  transcriptExcerpt: string;
  maxHighValueItems?: number;
  now?: Date;
}

export interface PrepareMediaForLearnerResult {
  preparation: MediaPreparation;
  candidates: VocabularyCandidate[];
}

export function prepareMediaForLearner(db: DatabaseSync, input: PrepareMediaForLearnerInput): PrepareMediaForLearnerResult {
  const lexemes = new SqliteLexemeRepository(db);
  const lexemeStates = new SqliteLearnerLexemeStateRepository(db);
  const allLexemes = lexemes.listAll(input.language);
  const knownLemmas = allLexemes
    .filter((lexeme) => lexemeStates.get(input.learnerId, lexeme.id) !== null)
    .map((lexeme) => lexeme.lemma);
  const existingLexemes = new Map(allLexemes.map((lexeme) => [lexeme.lemma.toLowerCase(), { id: lexeme.id, frequencyRank: lexeme.frequencyRank }]));

  const result = prepareMedia({
    title: input.title,
    transcriptExcerpt: input.transcriptExcerpt,
    knownLemmas,
    existingLexemes,
    maxHighValueItems: input.maxHighValueItems ?? DEFAULT_MAX_HIGH_VALUE_ITEMS,
  });

  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  db.exec("BEGIN");
  try {
    const highValueLexemeIds = result.highValueItems.map((candidate) => {
      if (candidate.existingLexemeId) return candidate.existingLexemeId;
      const lexemeId = createId();
      lexemes.upsert({ id: lexemeId, language: input.language, lemma: candidate.lemma, forms: [candidate.lemma], createdAt: nowIso, updatedAt: nowIso });
      return lexemeId;
    });

    const preparation: MediaPreparation = {
      id: createId(), learnerId: input.learnerId, title: input.title, transcriptExcerpt: input.transcriptExcerpt,
      language: input.language, estimatedComprehension: result.estimatedComprehension, highValueLexemeIds, preparedCount: 0,
      createdAt: nowIso, updatedAt: nowIso,
    };
    new SqliteMediaPreparationRepository(db).upsert(preparation);

    db.exec("COMMIT");
    return { preparation, candidates: result.highValueItems };
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
}

export interface CompleteMediaPreparationItemInput {
  learnerId: string;
  preparation: MediaPreparation;
  lexemeId: string;
  result: EncounterResult;
  now?: Date;
}

/** One flashcard-style "Got it" / "Need more practice" step of the Prepare Me drill. */
export function completeMediaPreparationItem(db: DatabaseSync, input: CompleteMediaPreparationItemInput): MediaPreparation {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const encounterRepos = lexemeEncounterRepos(db);

  db.exec("BEGIN");
  try {
    registerLexemeEncounterInTransaction(
      encounterRepos,
      {
        id: createId(), learnerId: input.learnerId, itemType: "LEXEME", itemId: input.lexemeId,
        modality: "READING", activity: "MEDIA_PREP", result: input.result, assistanceUsed: false, createdAt: nowIso,
      },
      0.6,
      now,
    );

    const updated: MediaPreparation = { ...input.preparation, preparedCount: input.preparation.preparedCount + 1, updatedAt: nowIso };
    new SqliteMediaPreparationRepository(db).upsert(updated);

    db.exec("COMMIT");
    return updated;
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
}
