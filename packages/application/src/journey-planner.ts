import type { EncounterActivity, LearnerInterest, Lexeme, ReviewItem } from "@gofluent/core";

/**
 * Deterministic Daily Journey Planner (PRD §10.1, ARCHITECTURE.md §46-47).
 * Pure and DB/AI-free by design (same testability bar as the scheduler,
 * ARCHITECTURE.md §43) — callers supply already-loaded data.
 */
export interface JourneyPlannerInput {
  dueReviewItems: ReviewItem[];
  candidateNewLexemes: Lexeme[];
  recentlySeenItemIds: string[];
  interests: LearnerInterest[];
  dailyMinutes: number;
  newItemBudget: number;
  maxReviewItems?: number;
}

export interface DailyJourneyPlan {
  reviewItemIds: string[];
  newLexemeIds: string[];
  storyTopic: string;
  activities: EncounterActivity[];
}

const DEFAULT_MAX_REVIEW_ITEMS = 15;
/** Rough minutes-per-review-item pacing used to bound the review batch size. */
const REVIEW_MINUTES_SHARE = 0.4;
const MINUTES_PER_REVIEW_ITEM = 1;

export function planDailyJourney(input: JourneyPlannerInput): DailyJourneyPlan {
  const reviewCapacity = Math.max(
    0,
    Math.min(
      input.maxReviewItems ?? DEFAULT_MAX_REVIEW_ITEMS,
      Math.round((input.dailyMinutes * REVIEW_MINUTES_SHARE) / MINUTES_PER_REVIEW_ITEM),
    ),
  );
  const reviewItemIds = [...input.dueReviewItems]
    .sort((a, b) => b.priority - a.priority || Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .slice(0, reviewCapacity)
    .map((item) => item.itemId);

  const recentlySeen = new Set(input.recentlySeenItemIds);
  const newLexemeIds = [...input.candidateNewLexemes]
    .filter((lexeme) => !recentlySeen.has(lexeme.id))
    .sort((a, b) => (a.frequencyRank ?? Number.MAX_SAFE_INTEGER) - (b.frequencyRank ?? Number.MAX_SAFE_INTEGER))
    .slice(0, Math.max(0, input.newItemBudget))
    .map((lexeme) => lexeme.id);

  const topInterest = [...input.interests].sort((a, b) => b.weight - a.weight)[0]?.interest ?? "everyday life";

  const activities: EncounterActivity[] = reviewItemIds.length > 0 ? ["REVIEW", "STORY", "RECAP"] : ["STORY", "RECAP"];

  return { reviewItemIds, newLexemeIds, storyTopic: topInterest, activities };
}
