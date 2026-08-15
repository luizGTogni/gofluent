import type { LearnerProfile } from "@gofluent/core";
import { createId } from "@gofluent/shared";
import { SqliteLearnerProfileRepository, SqliteSettingsRepository, type DatabaseSync } from "@gofluent/db";

/**
 * Multiple local profiles (ROADMAP Phase 8, DATABASE.md §105 — "a `users`
 * abstraction enables multiple local learner profiles later... should not
 * require schema redesign"). No schema change was needed: `users` and
 * `learner_profiles` were already generic; this only adds the active-profile
 * pointer (stored in the existing `settings` table) and a listing helper.
 */
export const ACTIVE_PROFILE_SETTING_KEY = "active_user_id";

export interface LocalProfileSummary {
  userId: string;
  profile: LearnerProfile | null;
}

export function listLocalProfiles(db: DatabaseSync): LocalProfileSummary[] {
  const userRows = db.prepare("SELECT id FROM users ORDER BY created_at").all() as Array<{ id: string }>;
  const profiles = new SqliteLearnerProfileRepository(db);
  return userRows.map((row) => ({ userId: row.id, profile: profiles.getByUserId(row.id) }));
}

/** Falls back to `fallbackUserId` when no active profile is set yet, or it no longer exists. */
export function getActiveUserId(db: DatabaseSync, fallbackUserId: string): string {
  const stored = new SqliteSettingsRepository(db).get(ACTIVE_PROFILE_SETTING_KEY);
  if (typeof stored !== "string") return fallbackUserId;
  const exists = db.prepare("SELECT 1 FROM users WHERE id=?").get(stored);
  return exists ? stored : fallbackUserId;
}

export function setActiveUserId(db: DatabaseSync, userId: string, now: Date = new Date()): void {
  new SqliteSettingsRepository(db).set(ACTIVE_PROFILE_SETTING_KEY, userId, now.toISOString());
}

/**
 * Creates a bare local profile slot and switches to it. `learner_profiles`
 * is intentionally left empty here — onboarding (which already
 * upserts-by-userId) fills it in on next launch, so no placeholder/fake
 * answers are written.
 */
export function createLocalProfile(db: DatabaseSync, now: Date = new Date()): { userId: string } {
  const userId = createId();
  const nowIso = now.toISOString();
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run(userId, nowIso, nowIso);
  setActiveUserId(db, userId, now);
  return { userId };
}
