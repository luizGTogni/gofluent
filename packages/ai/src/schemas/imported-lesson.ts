import { z } from "zod";
import { StoryComprehensionQuestionSchema } from "./story.js";

/**
 * ARCHITECTURE.md §93 "Learn From Anything" pipeline — the "lesson
 * generation" step over learner-supplied text. Unlike `StorySchema`, the
 * source text itself is NOT generated (it's the learner's own content); the
 * model only produces comprehension questions and short vocabulary notes for
 * the mined high-value words (PRD "vocabulary mining").
 */
export const ImportedLessonVocabularyNoteSchema = z.object({
  lemma: z.string().min(1),
  explanation: z.string().min(1),
});
export type ImportedLessonVocabularyNote = z.infer<typeof ImportedLessonVocabularyNoteSchema>;

export const ImportedLessonSchema = z.object({
  comprehensionQuestions: z.array(StoryComprehensionQuestionSchema).min(1).max(5),
  vocabularyNotes: z.array(ImportedLessonVocabularyNoteSchema).min(1),
});
export type ImportedLesson = z.infer<typeof ImportedLessonSchema>;

export const IMPORTED_LESSON_SCHEMA_NAME = "imported_lesson";
export const IMPORTED_LESSON_PROMPT_VERSION = "imported-lesson/v1";
