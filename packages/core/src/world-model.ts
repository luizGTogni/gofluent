/**
 * Learning Worlds (ROADMAP Phase 6, PRD §29, DATABASE.md §7 future `World`/
 * `WorldProgress`). Worlds are curated, language-scoped groupings of
 * vocabulary that stories/conversations/boss challenges can be themed
 * around. `WorldProgress.masteryScore` is derived, not incrementally
 * tracked — recomputed from `learner_lexeme_state` against the world's
 * target vocabulary (ARCHITECTURE.md §55 "derived from observed data").
 */
export interface World {
  id: string;
  language: string;
  key: string;
  name: string;
  description?: string | undefined;
  ordering: number;
  /** Lexeme IDs this world's mastery score is computed against. */
  targetLexemeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorldProgress {
  learnerId: string;
  worldId: string;
  masteryScore: number;
  bossChallengeCompleted: boolean;
  lastActivityAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface WorldRepository {
  get(id: string): World | null;
  getByKey(language: string, key: string): World | null;
  listAll(language: string): World[];
  upsert(world: World): void;
}

export interface WorldProgressRepository {
  get(learnerId: string, worldId: string): WorldProgress | null;
  upsert(progress: WorldProgress): void;
  listByLearner(learnerId: string): WorldProgress[];
}
