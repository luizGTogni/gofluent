/**
 * Shared domain enums for the encounter-driven learner model (DATABASE.md §26-29).
 * Stored as TEXT in SQLite; these unions are the validated TypeScript surface.
 */

export const ENCOUNTER_ITEM_TYPES = ["LEXEME", "CHUNK"] as const;
export type EncounterItemType = (typeof ENCOUNTER_ITEM_TYPES)[number];

export const ENCOUNTER_MODALITIES = [
  "READING",
  "LISTENING",
  "RECALL",
  "WRITING",
  "SPEAKING",
] as const;
export type EncounterModality = (typeof ENCOUNTER_MODALITIES)[number];

export const ENCOUNTER_ACTIVITIES = [
  "PLACEMENT",
  "REVIEW",
  "STORY",
  "LISTENING",
  "CONVERSATION",
  "RECAP",
  "BOSS_CHALLENGE",
  "IMPORTED_CONTENT",
] as const;
export type EncounterActivity = (typeof ENCOUNTER_ACTIVITIES)[number];

export const ENCOUNTER_RESULTS = ["SUCCESS", "PARTIAL", "FAIL", "SKIPPED"] as const;
export type EncounterResult = (typeof ENCOUNTER_RESULTS)[number];

export const CONTENT_STATUSES = ["GENERATING", "VALID", "INVALID", "ARCHIVED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const SESSION_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
  "FAILED",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];
