import { z } from "zod";

/**
 * ARCHITECTURE.md §52 Speak Mode Architecture — structured output contract
 * for one conversation turn. This is Layer 1, structural validation only;
 * domain validation (feedback conciseness, error-shape sanity) lives in
 * `@gofluent/content-engine` (mirrors `schemas/story.ts`).
 *
 * PRD §23 requires the tutor response, PRD §24 the concise feedback, and
 * PRD §25 the recurring-error candidates — kept as separate fields so the
 * TUI/application layer can treat "tutor response", "feedback", and
 * "learner-state evidence" as distinct concerns (ARCHITECTURE.md §52).
 */
export const ConversationCorrectionSchema = z.object({
  original: z.string().min(1),
  corrected: z.string().min(1),
});
export type ConversationCorrection = z.infer<typeof ConversationCorrectionSchema>;

export const ConversationErrorCategorySchema = z.enum([
  "GRAMMAR",
  "COLLOCATION",
  "WORD_CHOICE",
  "WORD_ORDER",
  "PRONUNCIATION",
  "SPELLING",
  "ARTICLE",
  "PREPOSITION",
  "PHRASAL_VERB",
]);

export const ConversationDetectedErrorSchema = z.object({
  category: ConversationErrorCategorySchema,
  original: z.string().min(1),
  preferred: z.string().min(1),
  /** Lemma-level pattern used for aggregation, e.g. "do + mistake" (DATABASE.md §50). */
  normalizedPattern: z.string().min(1),
});
export type ConversationDetectedError = z.infer<typeof ConversationDetectedErrorSchema>;

export const ConversationTurnSchema = z.object({
  tutorReply: z.string().min(1),
  feedback: z.object({
    good: z.array(z.string().min(1)).max(4),
    corrections: z.array(ConversationCorrectionSchema).max(3),
    newPhrase: z.string().min(1).optional(),
  }),
  detectedErrors: z.array(ConversationDetectedErrorSchema).max(3),
  /** Target/known lemmas the learner actually used this turn, for encounter extraction (ARCHITECTURE.md §52). */
  usedLemmas: z.array(z.string().min(1)),
});
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

export const CONVERSATION_SCHEMA_NAME = "conversation_turn";
export const CONVERSATION_PROMPT_VERSION = "conversation/v1";
