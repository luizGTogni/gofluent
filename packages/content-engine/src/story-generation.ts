import type { LLMProvider, Message, Story } from "@gofluent/ai";
import { STORY_PROMPT_VERSION, STORY_SCHEMA_NAME, StorySchema, zodOutputContract } from "@gofluent/ai";
import type { CefrLevel } from "@gofluent/core";
import { ContentGenerationError } from "@gofluent/core";
import { lexicalCoverage } from "@gofluent/lexical-engine";

/**
 * "Generate → Validate → Repair" pipeline (ARCHITECTURE.md §36-37): Layer 2
 * domain validation of AI-generated story content — lexical coverage,
 * target-item presence, unknown-vocabulary ratio. Never calls the LLM
 * itself; only the bounded retry loop below does, deterministically.
 */
export interface StoryGenerationRequest {
  language: string;
  topic: string;
  cefr: CefrLevel;
  knownLemmas: string[];
  newTargetLemmas: string[];
  reviewTargetLemmas: string[];
  maxUnknownRatio?: number;
}

export type StoryValidationIssueCode = "MISSING_TARGET_ITEM" | "MISSING_TARGET_ITEM_LISTING" | "UNKNOWN_RATIO_EXCEEDED";
export interface StoryValidationIssue { code: StoryValidationIssueCode; message: string; }
export interface StoryCoverage { knownRatio: number; reviewRatio: number; unknownRatio: number; }

const DEFAULT_MAX_UNKNOWN_RATIO = 0.08;

export function tokenizeLemmas(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

export function computeStoryCoverage(story: Story, request: StoryGenerationRequest): StoryCoverage {
  const known = new Set(request.knownLemmas.map((l) => l.toLowerCase()));
  const target = new Set([...request.newTargetLemmas, ...request.reviewTargetLemmas].map((l) => l.toLowerCase()));
  const tokens = tokenizeLemmas(story.text);
  let knownCount = 0;
  let targetCount = 0;
  let unknownCount = 0;
  for (const token of tokens) {
    if (target.has(token)) targetCount += 1;
    else if (known.has(token)) knownCount += 1;
    else unknownCount += 1;
  }
  return lexicalCoverage({ known: knownCount, review: targetCount, unknown: unknownCount });
}

export function validateStory(story: Story, request: StoryGenerationRequest): StoryValidationIssue[] {
  const issues: StoryValidationIssue[] = [];
  const textTokens = new Set(tokenizeLemmas(story.text));
  const listedTargets = new Set(story.targetItems.map((t) => t.toLowerCase()));
  const requiredTargets = [...request.newTargetLemmas, ...request.reviewTargetLemmas];

  for (const lemma of request.newTargetLemmas) {
    if (!textTokens.has(lemma.toLowerCase())) {
      issues.push({ code: "MISSING_TARGET_ITEM", message: `New target item "${lemma}" does not appear in the story text` });
    }
  }
  for (const lemma of requiredTargets) {
    if (!listedTargets.has(lemma.toLowerCase())) {
      issues.push({ code: "MISSING_TARGET_ITEM_LISTING", message: `Target item "${lemma}" missing from targetItems` });
    }
  }

  const coverage = computeStoryCoverage(story, request);
  const maxUnknownRatio = request.maxUnknownRatio ?? DEFAULT_MAX_UNKNOWN_RATIO;
  if (coverage.unknownRatio > maxUnknownRatio) {
    issues.push({
      code: "UNKNOWN_RATIO_EXCEEDED",
      message: `Unknown vocabulary ratio ${coverage.unknownRatio.toFixed(2)} exceeds bound ${maxUnknownRatio}`,
    });
  }
  return issues;
}

function buildStoryMessages(request: StoryGenerationRequest, previousIssues: StoryValidationIssue[]): Message[] {
  const system: Message = {
    role: "system",
    content: "You are GoFluent's adaptive story generator. Respond with ONLY JSON matching: " +
      '{"title": string, "text": string, "targetItems": string[], "comprehensionQuestions": [{"question": string, "options": string[], "correctOptionIndex": number}]}.',
  };
  const lines = [
    `Target language: ${request.language}. Learner CEFR level: ${request.cefr}.`,
    `Topic: ${request.topic}.`,
    `New vocabulary that MUST appear at least once, verbatim, in the story text: ${request.newTargetLemmas.join(", ") || "(none)"}.`,
    `Vocabulary under review that should reappear naturally: ${request.reviewTargetLemmas.join(", ") || "(none)"}.`,
    `Known vocabulary the learner is comfortable with (reuse freely): ${request.knownLemmas.slice(0, 40).join(", ") || "(none)"}.`,
    `List every new and review target item, lowercase, in "targetItems". Include 2-4 comprehension questions, each with 2-4 options and a correctOptionIndex.`,
  ];
  if (previousIssues.length > 0) {
    lines.push(`The previous attempt failed validation: ${previousIssues.map((i) => i.message).join("; ")}. Fix these issues.`);
  }
  return [system, { role: "user", content: lines.join("\n") }];
}

export interface GenerateStoryOptions { maxAttempts?: number; }
export interface GenerateStoryResult { story: Story; attempts: number; promptVersion: string; coverage: StoryCoverage; }

export async function generateStory(
  provider: LLMProvider,
  model: string,
  request: StoryGenerationRequest,
  options: GenerateStoryOptions = {},
): Promise<GenerateStoryResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const output = zodOutputContract(STORY_SCHEMA_NAME, StorySchema, provider.id);
  let issues: StoryValidationIssue[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await provider.generate({ model, messages: buildStoryMessages(request, issues), output });
    issues = validateStory(result.value, request);
    if (issues.length === 0) {
      return { story: result.value, attempts: attempt, promptVersion: STORY_PROMPT_VERSION, coverage: computeStoryCoverage(result.value, request) };
    }
  }
  throw new ContentGenerationError(
    `Story generation failed domain validation after ${maxAttempts} attempts: ${issues.map((i) => i.message).join("; ")}`,
  );
}
