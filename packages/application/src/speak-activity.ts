import type { LLMProvider } from "@gofluent/ai";
import type { ConversationTurn } from "@gofluent/ai";
import {
  generateConversationTurn,
  type ConversationTurnRequest,
  type GenerateConversationTurnResult,
} from "@gofluent/content-engine";
import type { CefrLevel, LearnerError } from "@gofluent/core";
import { learningValue } from "@gofluent/lexical-engine";
import { createId } from "@gofluent/shared";
import { SqliteLearnerErrorRepository, SqliteLexemeRepository, type DatabaseSync } from "@gofluent/db";
import { lexemeEncounterRepos, registerLexemeEncounterInTransaction } from "./register-encounter.js";
import { recentErrorSummaries, recordLearnerErrorInTransaction } from "./error-memory.js";

/**
 * Speak Mode orchestration (PRD §23-25, ARCHITECTURE.md §52-53): scenario →
 * context → learner input → LLM interpretation → response+feedback →
 * encounter extraction → persist evidence. Deterministic on both ends; the
 * only generative edge is `generateConversationTurn`.
 *
 * Per DATABASE.md §94, the raw conversation text is never persisted here —
 * only structured evidence (encounters, error memory) survives the turn. The
 * TUI is responsible for holding the in-memory `history` for the session.
 */
export interface ConversationHistoryTurn { speaker: "TUTOR" | "LEARNER"; text: string; }

export interface SubmitConversationTurnInput {
  learnerId: string;
  language: string;
  cefr: CefrLevel;
  scenario: string;
  knownLemmasSample: string[];
  targetLemmas: string[];
  history: ConversationHistoryTurn[];
  learnerMessage: string;
  sessionId?: string | undefined;
  now?: Date;
}

export interface SubmitConversationTurnResult {
  turn: ConversationTurn;
  attempts: number;
  recordedErrors: LearnerError[];
  matchedLemmaCount: number;
}

export async function submitConversationTurn(
  db: DatabaseSync,
  provider: LLMProvider,
  model: string,
  input: SubmitConversationTurnInput,
): Promise<SubmitConversationTurnResult> {
  const request: ConversationTurnRequest = {
    language: input.language,
    cefr: input.cefr,
    scenario: input.scenario,
    knownLemmasSample: input.knownLemmasSample,
    targetLemmas: input.targetLemmas,
    recentErrors: recentErrorSummaries(db, input.learnerId),
    history: input.history,
    learnerMessage: input.learnerMessage,
  };

  const generated: GenerateConversationTurnResult = await generateConversationTurn(provider, model, request);
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const lexemes = new SqliteLexemeRepository(db);
  const encounterRepos = lexemeEncounterRepos(db);
  const errorRepo = new SqliteLearnerErrorRepository(db);

  const recordedErrors: LearnerError[] = [];
  let matchedLemmaCount = 0;

  db.exec("BEGIN");
  try {
    for (const lemma of generated.turn.usedLemmas) {
      const [match] = lexemes.findByNormalizedForm(input.language, lemma);
      if (!match) continue;
      matchedLemmaCount += 1;
      const value = learningValue({
        ...(match.frequencyRank !== undefined ? { frequencyRank: match.frequencyRank } : {}),
        contextualUsefulness: 0.7,
        interestRelevance: 0.6,
        upcomingRelevance: 0.5,
        memoryNeed: 0.6,
      });
      registerLexemeEncounterInTransaction(
        encounterRepos,
        {
          id: createId(),
          learnerId: input.learnerId,
          itemType: "LEXEME",
          itemId: match.id,
          modality: "SPEAKING",
          activity: "CONVERSATION",
          result: "SUCCESS",
          assistanceUsed: false,
          sessionId: input.sessionId,
          createdAt: nowIso,
        },
        value,
        now,
      );
    }

    for (const detected of generated.turn.detectedErrors) {
      const recorded = recordLearnerErrorInTransaction(errorRepo, {
        learnerId: input.learnerId,
        category: detected.category,
        normalizedPattern: detected.normalizedPattern,
        exampleOriginal: detected.original,
        examplePreferred: detected.preferred,
        now,
      });
      recordedErrors.push(recorded);
    }

    db.exec("COMMIT");
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }

  return { turn: generated.turn, attempts: generated.attempts, recordedErrors, matchedLemmaCount };
}
