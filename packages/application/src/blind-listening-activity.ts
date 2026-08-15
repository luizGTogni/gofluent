import type { LLMProvider } from "@gofluent/ai";
import { generateStory, type StoryGenerationRequest } from "@gofluent/content-engine";
import type { CefrLevel, Content, EncounterResult } from "@gofluent/core";
import { createId } from "@gofluent/shared";
import { SqliteContentRepository, type DatabaseSync } from "@gofluent/db";
import { learningValue } from "@gofluent/lexical-engine";
import { registerLexemeEncounter } from "./register-encounter.js";

/**
 * "Increased exposure to listening without a transcript" (ROADMAP Phase 7).
 * Unlike the Daily Journey's `generateStoryActivity` (Phase 2), this is a
 * standalone immersion activity — no `learning_sessions`/`session_activities`
 * coupling — reached directly from the Immersion Feed. Content generation
 * itself reuses `generateStory` unchanged (Phase 2); the only new behavior
 * lives in the TUI screen, which never offers a transcript-reveal toggle
 * until after the comprehension check (unlike `StoryScreen`'s "t" toggle).
 */
export interface GenerateBlindListeningContentInput {
  learnerId: string;
  language: string;
  topic: string;
  cefr: CefrLevel;
  knownLemmas: string[];
}

export async function generateBlindListeningContent(
  db: DatabaseSync,
  provider: LLMProvider,
  model: string,
  input: GenerateBlindListeningContentInput,
  now: Date = new Date(),
): Promise<Content> {
  const request: StoryGenerationRequest = {
    language: input.language, topic: input.topic, cefr: input.cefr,
    knownLemmas: input.knownLemmas, newTargetLemmas: [], reviewTargetLemmas: [],
  };
  const generated = await generateStory(provider, model, request);
  const nowIso = now.toISOString();

  const content: Content = {
    id: createId(), learnerId: input.learnerId, contentType: "STORY",
    title: generated.story.title, bodyText: generated.story.text,
    language: input.language, topic: input.topic,
    estimatedDifficulty: undefined,
    knownRatio: generated.coverage.knownRatio, reviewRatio: generated.coverage.reviewRatio, unknownRatio: generated.coverage.unknownRatio,
    sourceType: "AI_GENERATED", sourceReference: undefined,
    provider: provider.id, model, promptVersion: generated.promptVersion, status: "VALID",
    metadata: { comprehensionQuestions: generated.story.comprehensionQuestions },
    createdAt: nowIso, updatedAt: nowIso,
  };
  new SqliteContentRepository(db).upsert(content);
  return content;
}

export interface CompleteListeningEncounterInput {
  learnerId: string;
  lexemeId: string;
  result: EncounterResult;
  frequencyRank?: number;
  contentId?: string;
  now?: Date;
}

/** Registers the debrief-stage vocabulary exposure (mirrors `completeReviewEncounter`). */
export function completeListeningEncounter(db: DatabaseSync, input: CompleteListeningEncounterInput) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const value = learningValue({
    ...(input.frequencyRank !== undefined ? { frequencyRank: input.frequencyRank } : {}),
    contextualUsefulness: 0.6, interestRelevance: 0.5, upcomingRelevance: 0.5, memoryNeed: 0.6,
  });
  return registerLexemeEncounter(db, {
    encounter: {
      id: createId(), learnerId: input.learnerId, itemType: "LEXEME", itemId: input.lexemeId,
      modality: "LISTENING", activity: "LISTENING", result: input.result, assistanceUsed: false,
      contentId: input.contentId, createdAt: nowIso,
    },
    learningValue: value,
    now,
  });
}
