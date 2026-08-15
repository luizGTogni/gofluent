import { describe, expect, it } from "vitest";
import { FakeProvider } from "@gofluent/ai";
import { evaluateBossChallenge, validateBossChallengeEvaluation, type BossChallengeEvaluationRequest } from "./boss-challenge-evaluation-generation.js";
import type { BossChallengeEvaluation } from "@gofluent/ai";

const request: BossChallengeEvaluationRequest = {
  language: "en",
  scenarioTitle: "Airport Check-In",
  scenario: "Check in for a flight and answer the agent's questions.",
  targetPhrases: ["Here is my passport"],
  transcript: [
    { speaker: "TUTOR", text: "Good morning! Passport, please." },
    { speaker: "LEARNER", text: "Here is my passport." },
  ],
};

describe("validateBossChallengeEvaluation", () => {
  it("passes a SUCCESS result backed by high scores", () => {
    const evaluation: BossChallengeEvaluation = {
      taskCompletion: 0.9, comprehension: 0.85, targetPhraseUsage: 0.8, abilityToContinue: 0.9,
      result: "SUCCESS", feedback: "Great job handling check-in!",
    };
    expect(validateBossChallengeEvaluation(evaluation)).toEqual([]);
  });

  it("flags a SUCCESS result backed by low scores", () => {
    const evaluation: BossChallengeEvaluation = {
      taskCompletion: 0.2, comprehension: 0.2, targetPhraseUsage: 0.1, abilityToContinue: 0.2,
      result: "SUCCESS", feedback: "Nice try.",
    };
    const issues = validateBossChallengeEvaluation(evaluation);
    expect(issues.some((i) => i.code === "SCORE_RESULT_MISMATCH")).toBe(true);
  });

  it("flags a FAIL result backed by high scores", () => {
    const evaluation: BossChallengeEvaluation = {
      taskCompletion: 0.9, comprehension: 0.9, targetPhraseUsage: 0.9, abilityToContinue: 0.9,
      result: "FAIL", feedback: "Odd.",
    };
    const issues = validateBossChallengeEvaluation(evaluation);
    expect(issues.some((i) => i.code === "SCORE_RESULT_MISMATCH")).toBe(true);
  });
});

describe("evaluateBossChallenge", () => {
  it("returns on the first valid attempt", async () => {
    const provider = new FakeProvider({
      responses: {
        boss_challenge_evaluation: [{
          taskCompletion: 0.9, comprehension: 0.85, targetPhraseUsage: 0.8, abilityToContinue: 0.9,
          result: "SUCCESS", feedback: "Great job!",
        }],
      },
    });
    const result = await evaluateBossChallenge(provider, "fake-model", request);
    expect(result.attempts).toBe(1);
    expect(result.evaluation.result).toBe("SUCCESS");
    expect(result.promptVersion).toBe("boss-challenge-evaluation/v1");
  });

  it("retries after a validation failure and succeeds on a later attempt", async () => {
    const provider = new FakeProvider({
      responses: {
        boss_challenge_evaluation: [
          { taskCompletion: 0.1, comprehension: 0.1, targetPhraseUsage: 0.1, abilityToContinue: 0.1, result: "SUCCESS", feedback: "x" },
          { taskCompletion: 0.9, comprehension: 0.9, targetPhraseUsage: 0.9, abilityToContinue: 0.9, result: "SUCCESS", feedback: "Great job!" },
        ],
      },
    });
    const result = await evaluateBossChallenge(provider, "fake-model", request);
    expect(result.attempts).toBe(2);
  });

  it("throws ContentGenerationError after exhausting retries", async () => {
    const provider = new FakeProvider({
      responses: {
        boss_challenge_evaluation: [
          { taskCompletion: 0.1, comprehension: 0.1, targetPhraseUsage: 0.1, abilityToContinue: 0.1, result: "SUCCESS", feedback: "x" },
          { taskCompletion: 0.1, comprehension: 0.1, targetPhraseUsage: 0.1, abilityToContinue: 0.1, result: "SUCCESS", feedback: "x" },
        ],
      },
    });
    await expect(evaluateBossChallenge(provider, "fake-model", request, { maxAttempts: 2 })).rejects.toThrow(/failed domain validation/);
  });
});
