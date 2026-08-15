import type { ConversationTurn, LLMProvider, Message } from "@gofluent/ai";
import { CONVERSATION_PROMPT_VERSION, CONVERSATION_SCHEMA_NAME, ConversationTurnSchema, zodOutputContract } from "@gofluent/ai";
import type { CefrLevel } from "@gofluent/core";
import { ContentGenerationError } from "@gofluent/core";

/**
 * "Generate → Validate → Repair" pipeline (ARCHITECTURE.md §36-37, mirrors
 * `story-generation.ts`) for one Speak Mode turn (PRD §23-25). Layer 2 domain
 * validation keeps the tutor near the learner's level and the feedback
 * concise ("SHOULD NOT produce overwhelming error dumps", PRD §24). Never
 * calls the LLM itself; only the bounded retry loop below does.
 */
export interface RecentErrorSummary {
  category: string;
  normalizedPattern: string;
  examplePreferred?: string | undefined;
}

export interface ConversationTurnRequest {
  language: string;
  cefr: CefrLevel;
  scenario: string;
  knownLemmasSample: string[];
  targetLemmas: string[];
  recentErrors: RecentErrorSummary[];
  history: Array<{ speaker: "TUTOR" | "LEARNER"; text: string }>;
  learnerMessage: string;
}

export type ConversationValidationIssueCode = "REPLY_TOO_LONG" | "TRIVIAL_CORRECTION" | "EMPTY_REPLY";
export interface ConversationValidationIssue { code: ConversationValidationIssueCode; message: string; }

/** PRD §23 "keep responses relatively short for beginners" — looser bound as CEFR rises. */
const MAX_REPLY_WORDS: Record<CefrLevel, number> = { A1: 35, A2: 45, B1: 60, B2: 80, C1: 100, C2: 120 };

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateConversationTurn(turn: ConversationTurn, request: ConversationTurnRequest): ConversationValidationIssue[] {
  const issues: ConversationValidationIssue[] = [];

  if (turn.tutorReply.trim().length === 0) {
    issues.push({ code: "EMPTY_REPLY", message: "Tutor reply must not be empty" });
  }

  const maxWords = MAX_REPLY_WORDS[request.cefr];
  if (wordCount(turn.tutorReply) > maxWords) {
    issues.push({
      code: "REPLY_TOO_LONG",
      message: `Tutor reply is ${wordCount(turn.tutorReply)} words, above the ${maxWords}-word bound for ${request.cefr}`,
    });
  }

  for (const correction of turn.feedback.corrections) {
    if (correction.original.trim().toLowerCase() === correction.corrected.trim().toLowerCase()) {
      issues.push({ code: "TRIVIAL_CORRECTION", message: `Correction "${correction.original}" -> "${correction.corrected}" makes no change` });
    }
  }

  return issues;
}

function buildConversationMessages(request: ConversationTurnRequest, previousIssues: ConversationValidationIssue[]): Message[] {
  const system: Message = {
    role: "system",
    content:
      "You are GoFluent's AI conversation tutor (Speak Mode). Speak near the learner's level, encourage the " +
      "target vocabulary naturally, avoid correcting every mistake immediately, maintain conversation flow, and " +
      "keep responses relatively short for beginners. Respond with ONLY JSON matching: " +
      '{"tutorReply": string, "feedback": {"good": string[], "corrections": [{"original": string, "corrected": string}], "newPhrase"?: string}, ' +
      '"detectedErrors": [{"category": string, "original": string, "preferred": string, "normalizedPattern": string}], "usedLemmas": string[]}.',
  };

  const lines = [
    `Target language: ${request.language}. Learner CEFR level: ${request.cefr}.`,
    `Conversation scenario: ${request.scenario}.`,
    `Known vocabulary the learner is comfortable with (reuse freely): ${request.knownLemmasSample.slice(0, 40).join(", ") || "(none)"}.`,
    `Target vocabulary to encourage naturally this turn: ${request.targetLemmas.join(", ") || "(none)"}.`,
    `Recent recurring errors (prioritize opportunities to nudge these, but do not correct every mistake): ${
      request.recentErrors.map((e) => `${e.category}: "${e.normalizedPattern}"${e.examplePreferred ? ` (prefer "${e.examplePreferred}")` : ""}`).join("; ") || "(none)"
    }.`,
    `Prioritize a few useful corrections (at most 3) — do not produce an overwhelming error dump.`,
    ...(request.history.length > 0
      ? [`Conversation so far:\n${request.history.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n")}`]
      : []),
    `Learner just said: "${request.learnerMessage}"`,
    `List every target/known lemma the learner actually used this turn in "usedLemmas", lowercase.`,
  ];

  if (previousIssues.length > 0) {
    lines.push(`The previous attempt failed validation: ${previousIssues.map((i) => i.message).join("; ")}. Fix these issues.`);
  }

  return [system, { role: "user", content: lines.join("\n") }];
}

export interface GenerateConversationTurnOptions { maxAttempts?: number; }
export interface GenerateConversationTurnResult { turn: ConversationTurn; attempts: number; promptVersion: string; }

export async function generateConversationTurn(
  provider: LLMProvider,
  model: string,
  request: ConversationTurnRequest,
  options: GenerateConversationTurnOptions = {},
): Promise<GenerateConversationTurnResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const output = zodOutputContract(CONVERSATION_SCHEMA_NAME, ConversationTurnSchema, provider.id);
  let issues: ConversationValidationIssue[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await provider.generate({ model, messages: buildConversationMessages(request, issues), output });
    issues = validateConversationTurn(result.value, request);
    if (issues.length === 0) {
      return { turn: result.value, attempts: attempt, promptVersion: CONVERSATION_PROMPT_VERSION };
    }
  }

  throw new ContentGenerationError(
    `Conversation turn generation failed domain validation after ${maxAttempts} attempts: ${issues.map((i) => i.message).join("; ")}`,
  );
}
