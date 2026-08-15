import type { LearningSession, SessionActivity } from "@gofluent/core";
import { createId } from "@gofluent/shared";
import { SqliteLearningSessionRepository, SqliteSessionActivityRepository, type DatabaseSync } from "@gofluent/db";
import type { DailyJourneyPlan } from "./journey-planner.js";

/** Resumable sessions (PRD §10.1, DATABASE.md `learning_sessions`/`session_activities`). */
export function findInProgressSession(db: DatabaseSync, learnerId: string): LearningSession | null {
  return new SqliteLearningSessionRepository(db).findInProgress(learnerId);
}

export function listSessionActivities(db: DatabaseSync, sessionId: string): SessionActivity[] {
  return new SqliteSessionActivityRepository(db).listBySession(sessionId);
}

export function startDailyJourneySession(
  db: DatabaseSync,
  learnerId: string,
  plan: DailyJourneyPlan,
  plannedMinutes: number,
  now: Date = new Date(),
): { session: LearningSession; activities: SessionActivity[] } {
  const nowIso = now.toISOString();
  const session: LearningSession = {
    id: createId(), learnerId, sessionType: "DAILY_JOURNEY", status: "IN_PROGRESS",
    plannedMinutes, actualSeconds: undefined, startedAt: nowIso, completedAt: undefined,
    metadata: { plan }, createdAt: nowIso, updatedAt: nowIso,
  };
  const activities: SessionActivity[] = plan.activities.map((activityType, index) => ({
    id: createId(), sessionId: session.id, activityType, sequenceNumber: index, status: "PLANNED",
    contentId: undefined, startedAt: undefined, completedAt: undefined, metadata: undefined,
    createdAt: nowIso, updatedAt: nowIso,
  }));

  db.exec("BEGIN");
  try {
    const sessions = new SqliteLearningSessionRepository(db);
    const sessionActivities = new SqliteSessionActivityRepository(db);
    sessions.upsert(session);
    for (const activity of activities) sessionActivities.upsert(activity);
    db.exec("COMMIT");
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
  return { session, activities };
}

export function startSessionActivity(db: DatabaseSync, activity: SessionActivity, now: Date = new Date()): SessionActivity {
  const updated: SessionActivity = { ...activity, status: "IN_PROGRESS", startedAt: activity.startedAt ?? now.toISOString(), updatedAt: now.toISOString() };
  new SqliteSessionActivityRepository(db).upsert(updated);
  return updated;
}

export function completeSessionActivity(db: DatabaseSync, activity: SessionActivity, now: Date = new Date()): SessionActivity {
  const updated: SessionActivity = { ...activity, status: "COMPLETED", completedAt: now.toISOString(), updatedAt: now.toISOString() };
  new SqliteSessionActivityRepository(db).upsert(updated);
  return updated;
}

export function completeSession(db: DatabaseSync, session: LearningSession, now: Date = new Date()): LearningSession {
  const nowIso = now.toISOString();
  const startedAt = session.startedAt ? Date.parse(session.startedAt) : Date.parse(nowIso);
  const updated: LearningSession = { ...session, status: "COMPLETED", completedAt: nowIso, actualSeconds: Math.max(0, Math.round((Date.parse(nowIso) - startedAt) / 1000)), updatedAt: nowIso };
  new SqliteLearningSessionRepository(db).upsert(updated);
  return updated;
}

export function abandonSession(db: DatabaseSync, session: LearningSession, now: Date = new Date()): LearningSession {
  const updated: LearningSession = { ...session, status: "ABANDONED", updatedAt: now.toISOString() };
  new SqliteLearningSessionRepository(db).upsert(updated);
  return updated;
}
