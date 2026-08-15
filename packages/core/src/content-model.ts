/**
 * Generated/imported content entities (DATABASE.md `content`,
 * `content_target_items`; ARCHITECTURE.md §39 Content Entity).
 */
import type { LexicalItemType } from "./learner-model.js";
import type { ContentStatus } from "./enums.js";

export const CONTENT_TYPES = ["STORY", "IMPORTED_TEXT"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_SOURCE_TYPES = ["AI_GENERATED", "IMPORTED", "SEED"] as const;
export type ContentSourceType = (typeof CONTENT_SOURCE_TYPES)[number];

export const CONTENT_TARGET_ITEM_ROLES = ["NEW", "REVIEW"] as const;
export type ContentTargetItemRole = (typeof CONTENT_TARGET_ITEM_ROLES)[number];

export interface Content {
  id: string;
  learnerId?: string | undefined;
  contentType: ContentType;
  title?: string | undefined;
  bodyText?: string | undefined;
  language: string;
  topic?: string | undefined;
  estimatedDifficulty?: number | undefined;
  knownRatio?: number | undefined;
  reviewRatio?: number | undefined;
  unknownRatio?: number | undefined;
  sourceType: ContentSourceType;
  sourceReference?: string | undefined;
  provider?: string | undefined;
  model?: string | undefined;
  promptVersion?: string | undefined;
  status: ContentStatus;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ContentTargetItem {
  id: string;
  contentId: string;
  itemType: LexicalItemType;
  itemId: string;
  role: ContentTargetItemRole;
}

export interface ContentRepository {
  get(id: string): Content | null;
  upsert(content: Content): void;
  listTargetItems(contentId: string): ContentTargetItem[];
  replaceTargetItems(contentId: string, items: ContentTargetItem[]): void;
}
