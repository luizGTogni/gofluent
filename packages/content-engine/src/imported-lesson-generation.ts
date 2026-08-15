import type { ImportedLesson, LLMProvider, Message } from "@gofluent/ai";
import { IMPORTED_LESSON_PROMPT_VERSION, IMPORTED_LESSON_SCHEMA_NAME, ImportedLessonSchema, zodOutputContract } from "@gofluent/ai";
import { ContentGenerationError } from "@gofluent/core";

/**
 * "Generate → Validate → Repair" pipeline (ARCHITECTURE.md §36-37, mirrors
 * `story-generation.ts`) for the "lesson generation" step of Learn From
 * Anything (ARCHITECTURE.md §93). The source text is the learner's own
 * content and is passed through unchanged — only comprehension questions and
 * vocabulary notes are generated.
 */
export interface ImportedLessonRequest {
  language: string;
  sourceText: string;
  /** High-value lemmas mined by `analyzeImportedText`, in priority order. */
  targetLemmas: string[];
}

export type ImportedLessonValidationIssueCode = "MISSING_VOCABULARY_NOTE" | "QUESTION_NOT_GROUNDED";
export interface ImportedLessonValidationIssue { code: ImportedLessonValidationIssueCode; message: string; }

export function validateImportedLesson(lesson: ImportedLesson, request: ImportedLessonRequest): ImportedLessonValidationIssue[] {
  const issues: ImportedLessonValidationIssue[] = [];
  const noted = new Set(lesson.vocabularyNotes.map((n) => n.lemma.toLowerCase()));

  for (const lemma of request.targetLemmas) {
    if (!noted.has(lemma.toLowerCase())) {
      issues.push({ code: "MISSING_VOCABULARY_NOTE", message: `Target lemma "${lemma}" has no vocabulary note` });
    }
  }

  return issues;
}

function buildImportedLessonMessages(request: ImportedLessonRequest, previousIssues: ImportedLessonValidationIssue[]): Message[] {
  const system: Message = {
    role: "system",
    content:
      "You are GoFluent's Learn From Anything lesson builder. The learner supplied their own text below; do NOT " +
      "rewrite or summarize it — only build comprehension questions grounded in it and short vocabulary notes. " +
      "Respond with ONLY JSON matching: " +
      '{"comprehensionQuestions": [{"question": string, "options": string[], "correctOptionIndex": number}], ' +
      '"vocabularyNotes": [{"lemma": string, "explanation": string}]}.',
  };
  const lines = [
    `Target language: ${request.language}.`,
    `Source text:\n"""\n${request.sourceText}\n"""`,
    `High-value vocabulary mined from this text, one note each (short, learner-facing explanation in context): ${request.targetLemmas.join(", ") || "(none)"}.`,
    `Include 1-5 comprehension questions, each with 2-4 options and a correctOptionIndex, grounded only in the source text above.`,
  ];
  if (previousIssues.length > 0) {
    lines.push(`The previous attempt failed validation: ${previousIssues.map((i) => i.message).join("; ")}. Fix these issues.`);
  }
  return [system, { role: "user", content: lines.join("\n") }];
}

export interface GenerateImportedLessonOptions { maxAttempts?: number; }
export interface GenerateImportedLessonResult { lesson: ImportedLesson; attempts: number; promptVersion: string; }

export async function generateImportedLesson(
  provider: LLMProvider,
  model: string,
  request: ImportedLessonRequest,
  options: GenerateImportedLessonOptions = {},
): Promise<GenerateImportedLessonResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const output = zodOutputContract(IMPORTED_LESSON_SCHEMA_NAME, ImportedLessonSchema, provider.id);
  let issues: ImportedLessonValidationIssue[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await provider.generate({ model, messages: buildImportedLessonMessages(request, issues), output });
    issues = validateImportedLesson(result.value, request);
    if (issues.length === 0) {
      return { lesson: result.value, attempts: attempt, promptVersion: IMPORTED_LESSON_PROMPT_VERSION };
    }
  }

  throw new ContentGenerationError(
    `Imported lesson generation failed domain validation after ${maxAttempts} attempts: ${issues.map((i) => i.message).join("; ")}`,
  );
}
