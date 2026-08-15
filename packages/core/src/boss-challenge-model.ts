/**
 * Boss Challenges (ROADMAP Phase 6, PRD §30, DATABASE.md §7 future
 * `BossChallenge`). A boss challenge is a realistic-scenario conversation,
 * evaluated on task completion, comprehension, target-phrase usage, and
 * ability to continue — not grammatical perfection (PRD §30). Attempts are
 * append-only evidence, mirroring `learner_errors`/`imported_content`.
 */
import type { BossChallengeResult } from "./enums.js";

export interface BossChallenge {
  id: string;
  worldId: string;
  language: string;
  key: string;
  title: string;
  scenario: string;
  targetPhrases: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BossChallengeAttempt {
  id: string;
  learnerId: string;
  bossChallengeId: string;
  sessionId?: string | undefined;
  taskCompletion: number;
  comprehension: number;
  targetPhraseUsage: number;
  abilityToContinue: number;
  result: BossChallengeResult;
  feedback?: string | undefined;
  createdAt: string;
}

export interface BossChallengeRepository {
  get(id: string): BossChallenge | null;
  getByKey(worldId: string, key: string): BossChallenge | null;
  listByWorld(worldId: string): BossChallenge[];
  upsert(challenge: BossChallenge): void;
}

export interface BossChallengeAttemptRepository {
  insert(attempt: BossChallengeAttempt): void;
  listByLearner(learnerId: string, limit: number): BossChallengeAttempt[];
  bestForChallenge(learnerId: string, bossChallengeId: string): BossChallengeAttempt | null;
}
