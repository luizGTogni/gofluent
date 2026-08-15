import { z } from "zod";

/**
 * ARCHITECTURE.md §35 — structured output contract for adaptive story
 * generation (PRD §18). This is Layer 1, structural validation only; domain
 * validation (lexical coverage, target-item presence, unknown ratio) lives
 * in `@gofluent/content-engine` (ARCHITECTURE.md §36-37).
 */
export const StoryComprehensionQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctOptionIndex: z.number().int().min(0),
});
export type StoryComprehensionQuestion = z.infer<typeof StoryComprehensionQuestionSchema>;

export const StorySchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  targetItems: z.array(z.string().min(1)).min(1),
  comprehensionQuestions: z.array(StoryComprehensionQuestionSchema).min(1),
});
export type Story = z.infer<typeof StorySchema>;

export const STORY_SCHEMA_NAME = "story";
export const STORY_PROMPT_VERSION = "story/v1";
