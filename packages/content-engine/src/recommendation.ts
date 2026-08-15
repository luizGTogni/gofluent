import type { LearnerInterest } from "@gofluent/core";

/**
 * Content recommendation engine / "Immersion Feed" (ROADMAP Phase 7,
 * RESEARCH.md §30). Pure and DB/AI-free by design (mirrors
 * `journey-planner.ts`) — callers supply already-loaded lexical-state
 * counts. This ranks/shapes *recommendations*; actually generating a
 * chosen item's content still goes through the existing story/conversation
 * pipelines (Phase 2/4), so there is no parallel content system here.
 */
export const IMMERSION_FEED_KINDS = ["PODCAST", "STORY", "DIALOGUE", "ARTICLE", "CONVERSATION"] as const;
export type ImmersionFeedKind = (typeof IMMERSION_FEED_KINDS)[number];

/** RESEARCH.md §30's own example durations, kept as the MVP default pacing. */
const KIND_MINUTES: Record<ImmersionFeedKind, number> = {
  PODCAST: 2, STORY: 3, DIALOGUE: 1, ARTICLE: 4, CONVERSATION: 3,
};

export interface ImmersionFeedItem {
  kind: ImmersionFeedKind;
  topic: string;
  estimatedMinutes: number;
  estimatedComprehension: number;
  newVocabularyCount: number;
  reviewVocabularyCount: number;
  /** Cumulative graduated-difficulty nudge across the feed (RESEARCH.md §58 "immersion should be graduated"). */
  difficultyDelta: number;
}

export interface ImmersionFeedInput {
  interests: LearnerInterest[];
  /** Extra topic variety once interests run out (e.g. World names, ROADMAP Phase 6). */
  worldTopics: string[];
  dueReviewCount: number;
  candidateNewLexemeCount: number;
  maxItems?: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const DEFAULT_MAX_ITEMS = 5;
/** Rough reading/listening pace used only to translate a word count into a comprehension estimate. */
const WORDS_PER_MINUTE = 130;
const DIFFICULTY_STEP = 0.01;
const FALLBACK_TOPIC = "everyday life";

function topicSequence(interests: LearnerInterest[], worldTopics: string[], length: number): string[] {
  const ranked = [...interests].sort((a, b) => b.weight - a.weight).map((i) => i.interest);
  const pool = [...ranked, ...worldTopics];
  if (pool.length === 0) return Array.from({ length }, () => FALLBACK_TOPIC);
  return Array.from({ length }, (_, i) => pool[i % pool.length] as string);
}

/** Splits `total` into `count` non-negative shares, front-loaded (earlier feed items get the remainder). */
function distribute(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function buildImmersionFeed(input: ImmersionFeedInput): ImmersionFeedItem[] {
  const maxItems = input.maxItems ?? DEFAULT_MAX_ITEMS;
  if (maxItems <= 0) return [];

  const topics = topicSequence(input.interests, input.worldTopics, maxItems);
  const newVocabShares = distribute(Math.max(0, input.candidateNewLexemeCount), maxItems);
  const reviewVocabShares = distribute(Math.max(0, input.dueReviewCount), maxItems);

  return Array.from({ length: maxItems }, (_, index) => {
    const kind = IMMERSION_FEED_KINDS[index % IMMERSION_FEED_KINDS.length] as ImmersionFeedKind;
    const estimatedMinutes = KIND_MINUTES[kind];
    const newVocabularyCount = newVocabShares[index] ?? 0;
    const totalWords = estimatedMinutes * WORDS_PER_MINUTE;
    const estimatedComprehension = clamp01(1 - newVocabularyCount / totalWords);

    return {
      kind,
      topic: topics[index] as string,
      estimatedMinutes,
      estimatedComprehension,
      newVocabularyCount,
      reviewVocabularyCount: reviewVocabShares[index] ?? 0,
      difficultyDelta: index * DIFFICULTY_STEP,
    };
  });
}
