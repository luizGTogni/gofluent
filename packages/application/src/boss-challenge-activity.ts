import type { LLMProvider } from "@gofluent/ai";
import { evaluateBossChallenge, type BossChallengeTranscriptTurn } from "@gofluent/content-engine";
import type { BossChallenge, BossChallengeAttempt, WorldProgress } from "@gofluent/core";
import { createId } from "@gofluent/shared";
import { SqliteBossChallengeAttemptRepository, SqliteWorldProgressRepository, type DatabaseSync } from "@gofluent/db";
import { recomputeWorldMastery } from "./world-activity.js";

export type { BossChallengeTranscriptTurn };

/**
 * Boss Challenge orchestration (ROADMAP Phase 6, PRD §30). The turn-by-turn
 * conversation reuses Speak Mode's `submitConversationTurn` unchanged
 * (ROADMAP Phase 6 depends on Phase 4 for exactly this reason — no separate
 * conversation engine); this module only adds the end-of-challenge
 * evaluation and world-progress update.
 */
export interface EvaluateBossChallengeAttemptInput {
  learnerId: string;
  bossChallenge: BossChallenge;
  transcript: BossChallengeTranscriptTurn[];
  sessionId?: string | undefined;
  now?: Date;
}

export interface EvaluateBossChallengeAttemptResult {
  attempt: BossChallengeAttempt;
  worldProgress: WorldProgress;
}

export async function evaluateBossChallengeAttempt(
  db: DatabaseSync,
  provider: LLMProvider,
  model: string,
  input: EvaluateBossChallengeAttemptInput,
): Promise<EvaluateBossChallengeAttemptResult> {
  const generated = await evaluateBossChallenge(provider, model, {
    language: input.bossChallenge.language,
    scenarioTitle: input.bossChallenge.title,
    scenario: input.bossChallenge.scenario,
    targetPhrases: input.bossChallenge.targetPhrases,
    transcript: input.transcript,
  });

  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const attempt: BossChallengeAttempt = {
    id: createId(), learnerId: input.learnerId, bossChallengeId: input.bossChallenge.id, sessionId: input.sessionId,
    taskCompletion: generated.evaluation.taskCompletion, comprehension: generated.evaluation.comprehension,
    targetPhraseUsage: generated.evaluation.targetPhraseUsage, abilityToContinue: generated.evaluation.abilityToContinue,
    result: generated.evaluation.result, feedback: generated.evaluation.feedback, createdAt: nowIso,
  };
  new SqliteBossChallengeAttemptRepository(db).insert(attempt);

  let worldProgress = recomputeWorldMastery(db, input.learnerId, input.bossChallenge.worldId, now);
  if (generated.evaluation.result === "SUCCESS" && !worldProgress.bossChallengeCompleted) {
    worldProgress = { ...worldProgress, bossChallengeCompleted: true };
    new SqliteWorldProgressRepository(db).upsert(worldProgress);
  }

  return { attempt, worldProgress };
}
