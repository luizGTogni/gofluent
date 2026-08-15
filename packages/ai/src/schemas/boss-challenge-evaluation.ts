import { z } from "zod";

/**
 * PRD §30 Boss Challenge — evaluated on task completion, comprehension,
 * target-phrase usage, and ability to continue communication, explicitly
 * NOT on grammatical perfection. This is the "final evaluation" step run
 * once a boss-challenge conversation ends; individual turns still flow
 * through the regular `ConversationTurnSchema` (Speak Mode, Phase 4).
 */
export const BossChallengeResultSchema = z.enum(["SUCCESS", "PARTIAL", "FAIL"]);

export const BossChallengeEvaluationSchema = z.object({
  taskCompletion: z.number().min(0).max(1),
  comprehension: z.number().min(0).max(1),
  targetPhraseUsage: z.number().min(0).max(1),
  abilityToContinue: z.number().min(0).max(1),
  result: BossChallengeResultSchema,
  feedback: z.string().min(1),
});
export type BossChallengeEvaluation = z.infer<typeof BossChallengeEvaluationSchema>;

export const BOSS_CHALLENGE_EVALUATION_SCHEMA_NAME = "boss_challenge_evaluation";
export const BOSS_CHALLENGE_EVALUATION_PROMPT_VERSION = "boss-challenge-evaluation/v1";
