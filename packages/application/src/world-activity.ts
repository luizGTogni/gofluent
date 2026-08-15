import type { World, WorldProgress } from "@gofluent/core";
import { SqliteLearnerLexemeStateRepository, SqliteWorldProgressRepository, SqliteWorldRepository, type DatabaseSync } from "@gofluent/db";

/**
 * Learning Worlds (ROADMAP Phase 6, PRD §29). `masteryScore` is always
 * recomputed from current `learner_lexeme_state`, never incrementally
 * tracked — same "derived, not stored" principle as Progress screen metrics
 * (ARCHITECTURE.md §55).
 */
export function listWorldsWithProgress(db: DatabaseSync, learnerId: string, language: string): Array<{ world: World; progress: WorldProgress | null }> {
  const worldRepo = new SqliteWorldRepository(db);
  const progressRepo = new SqliteWorldProgressRepository(db);
  return worldRepo.listAll(language).map((world) => ({ world, progress: progressRepo.get(learnerId, world.id) }));
}

/**
 * Threshold for counting a lexeme as "mastered" toward world mastery.
 * No canonical mastery threshold is defined yet (DATABASE.md §67 — labels
 * should derive from continuous scores, but leaves the cut point open); 0.6
 * is a deliberate MVP choice, kept local to this one calculation.
 */
export const WORLD_MASTERY_THRESHOLD = 0.6;

export function recomputeWorldMastery(db: DatabaseSync, learnerId: string, worldId: string, now: Date = new Date()): WorldProgress {
  const worldRepo = new SqliteWorldRepository(db);
  const world = worldRepo.get(worldId);
  if (!world) throw new Error(`World ${worldId} not found`);

  const states = new SqliteLearnerLexemeStateRepository(db);
  const masteredCount = world.targetLexemeIds.filter((id) => (states.get(learnerId, id)?.productiveScore ?? 0) >= WORLD_MASTERY_THRESHOLD).length;
  const masteryScore = world.targetLexemeIds.length === 0 ? 0 : masteredCount / world.targetLexemeIds.length;

  const progressRepo = new SqliteWorldProgressRepository(db);
  const existing = progressRepo.get(learnerId, worldId);
  const nowIso = now.toISOString();
  const progress: WorldProgress = {
    learnerId, worldId, masteryScore,
    bossChallengeCompleted: existing?.bossChallengeCompleted ?? false,
    lastActivityAt: nowIso,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
  progressRepo.upsert(progress);
  return progress;
}
