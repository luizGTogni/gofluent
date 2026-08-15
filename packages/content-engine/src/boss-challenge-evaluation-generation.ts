import type { BossChallengeEvaluation, LLMProvider, Message } from "@gofluent/ai";
import { BOSS_CHALLENGE_EVALUATION_PROMPT_VERSION, BOSS_CHALLENGE_EVALUATION_SCHEMA_NAME, BossChallengeEvaluationSchema, zodOutputContract } from "@gofluent/ai";
import { ContentGenerationError } from "@gofluent/core";

/**
 * "Generate → Validate → Repair" pipeline (ARCHITECTURE.md §36-37, mirrors
 * `conversation-generation.ts`) for the Boss Challenge final evaluation
 * (PRD §30). Runs once, after a boss-challenge conversation ends — not per
 * turn (that's `generateConversationTurn`, Phase 4).
 */
export interface BossChallengeTranscriptTurn { speaker: "TUTOR" | "LEARNER"; text: string; }

export interface BossChallengeEvaluationRequest {
  language: string;
  scenarioTitle: string;
  scenario: string;
  targetPhrases: string[];
  transcript: BossChallengeTranscriptTurn[];
}

export type BossChallengeValidationIssueCode = "SCORE_RESULT_MISMATCH";
export interface BossChallengeValidationIssue { code: BossChallengeValidationIssueCode; message: string; }

const SUCCESS_FLOOR = 0.7;
const FAIL_CEILING = 0.4;

export function validateBossChallengeEvaluation(evaluation: BossChallengeEvaluation): BossChallengeValidationIssue[] {
  const issues: BossChallengeValidationIssue[] = [];
  const average = (evaluation.taskCompletion + evaluation.comprehension + evaluation.targetPhraseUsage + evaluation.abilityToContinue) / 4;

  if (evaluation.result === "SUCCESS" && average < SUCCESS_FLOOR) {
    issues.push({ code: "SCORE_RESULT_MISMATCH", message: `result "SUCCESS" is inconsistent with an average score of ${average.toFixed(2)} (below ${SUCCESS_FLOOR})` });
  }
  if (evaluation.result === "FAIL" && average > FAIL_CEILING) {
    issues.push({ code: "SCORE_RESULT_MISMATCH", message: `result "FAIL" is inconsistent with an average score of ${average.toFixed(2)} (above ${FAIL_CEILING})` });
  }

  return issues;
}

function buildBossChallengeEvaluationMessages(request: BossChallengeEvaluationRequest, previousIssues: BossChallengeValidationIssue[]): Message[] {
  const system: Message = {
    role: "system",
    content:
      "You are GoFluent's Boss Challenge evaluator. Score the learner's performance in this realistic scenario " +
      "conversation on task completion, comprehension, target-phrase usage, and ability to continue communication " +
      "— NOT on grammatical perfection (PRD §30). Respond with ONLY JSON matching: " +
      '{"taskCompletion": number 0-1, "comprehension": number 0-1, "targetPhraseUsage": number 0-1, ' +
      '"abilityToContinue": number 0-1, "result": "SUCCESS"|"PARTIAL"|"FAIL", "feedback": string}.',
  };
  const lines = [
    `Target language: ${request.language}.`,
    `Scenario: ${request.scenarioTitle} — ${request.scenario}`,
    `Phrases the learner was encouraged to use: ${request.targetPhrases.join(", ") || "(none)"}.`,
    `Conversation transcript:\n${request.transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n") || "(no exchange happened)"}`,
    `"result" should be "SUCCESS" for a strong average score, "FAIL" for a weak one, "PARTIAL" otherwise. Keep "feedback" short and encouraging.`,
  ];
  if (previousIssues.length > 0) {
    lines.push(`The previous attempt failed validation: ${previousIssues.map((i) => i.message).join("; ")}. Fix these issues.`);
  }
  return [system, { role: "user", content: lines.join("\n") }];
}

export interface EvaluateBossChallengeOptions { maxAttempts?: number; }
export interface EvaluateBossChallengeResult { evaluation: BossChallengeEvaluation; attempts: number; promptVersion: string; }

export async function evaluateBossChallenge(
  provider: LLMProvider,
  model: string,
  request: BossChallengeEvaluationRequest,
  options: EvaluateBossChallengeOptions = {},
): Promise<EvaluateBossChallengeResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const output = zodOutputContract(BOSS_CHALLENGE_EVALUATION_SCHEMA_NAME, BossChallengeEvaluationSchema, provider.id);
  let issues: BossChallengeValidationIssue[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await provider.generate({ model, messages: buildBossChallengeEvaluationMessages(request, issues), output });
    issues = validateBossChallengeEvaluation(result.value);
    if (issues.length === 0) {
      return { evaluation: result.value, attempts: attempt, promptVersion: BOSS_CHALLENGE_EVALUATION_PROMPT_VERSION };
    }
  }

  throw new ContentGenerationError(
    `Boss Challenge evaluation failed domain validation after ${maxAttempts} attempts: ${issues.map((i) => i.message).join("; ")}`,
  );
}
