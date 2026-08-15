/**
 * Learning sessions and their activities (DATABASE.md `learning_sessions`,
 * `session_activities`; PRD §10.1 Session Planner) plus onboarding interests
 * (DATABASE.md `learner_interests`; PRD §9.3).
 */
import type { EncounterActivity, SessionStatus } from "./enums.js";

export const SESSION_TYPES = ["DAILY_JOURNEY"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export interface LearningSession {
  id: string;
  learnerId: string;
  sessionType: SessionType;
  status: SessionStatus;
  plannedMinutes?: number | undefined;
  actualSeconds?: number | undefined;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface SessionActivity {
  id: string;
  sessionId: string;
  activityType: EncounterActivity;
  sequenceNumber: number;
  status: SessionStatus;
  contentId?: string | undefined;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerInterest {
  id: string;
  userId: string;
  interest: string;
  weight: number;
  createdAt: string;
}

export interface LearningSessionRepository {
  get(id: string): LearningSession | null;
  upsert(session: LearningSession): void;
  findInProgress(learnerId: string): LearningSession | null;
}

export interface SessionActivityRepository {
  listBySession(sessionId: string): SessionActivity[];
  upsert(activity: SessionActivity): void;
}

export interface LearnerInterestRepository {
  listByUser(userId: string): LearnerInterest[];
  replaceAll(userId: string, interests: LearnerInterest[]): void;
}
