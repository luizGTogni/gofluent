import { describe, expect, it } from "vitest";
import type { LearnerInterest } from "@gofluent/core";
import { buildImmersionFeed, IMMERSION_FEED_KINDS } from "./recommendation.js";

const now = "2026-01-01T00:00:00.000Z";
const interests: LearnerInterest[] = [
  { id: "i1", userId: "u", interest: "cooking", weight: 0.9, createdAt: now },
  { id: "i2", userId: "u", interest: "music", weight: 0.5, createdAt: now },
];

describe("buildImmersionFeed", () => {
  it("returns the default 5-item feed cycling through all kinds", () => {
    const feed = buildImmersionFeed({ interests, worldTopics: [], dueReviewCount: 0, candidateNewLexemeCount: 0 });
    expect(feed).toHaveLength(5);
    expect(new Set(feed.map((i) => i.kind))).toEqual(new Set(IMMERSION_FEED_KINDS));
  });

  it("orders topics by interest weight, falling back to world topics once interests are exhausted", () => {
    const feed = buildImmersionFeed({ interests, worldTopics: ["Travel"], dueReviewCount: 0, candidateNewLexemeCount: 0, maxItems: 3 });
    expect(feed.map((i) => i.topic)).toEqual(["cooking", "music", "Travel"]);
  });

  it("falls back to a generic topic when there are no interests or worlds", () => {
    const feed = buildImmersionFeed({ interests: [], worldTopics: [], dueReviewCount: 0, candidateNewLexemeCount: 0, maxItems: 2 });
    expect(feed.every((i) => i.topic === "everyday life")).toBe(true);
  });

  it("distributes new/review vocabulary counts across items without exceeding the totals", () => {
    const feed = buildImmersionFeed({ interests, worldTopics: [], dueReviewCount: 18, candidateNewLexemeCount: 7, maxItems: 5 });
    expect(feed.reduce((sum, i) => sum + i.newVocabularyCount, 0)).toBe(7);
    expect(feed.reduce((sum, i) => sum + i.reviewVocabularyCount, 0)).toBe(18);
  });

  it("increases estimated difficulty across the feed (graduated immersion)", () => {
    const feed = buildImmersionFeed({ interests, worldTopics: [], dueReviewCount: 0, candidateNewLexemeCount: 0, maxItems: 3 });
    expect(feed[0]?.difficultyDelta).toBe(0);
    expect(feed[1]!.difficultyDelta).toBeGreaterThan(feed[0]!.difficultyDelta);
    expect(feed[2]!.difficultyDelta).toBeGreaterThan(feed[1]!.difficultyDelta);
  });

  it("lowers estimated comprehension as new-vocabulary load increases", () => {
    const light = buildImmersionFeed({ interests, worldTopics: [], dueReviewCount: 0, candidateNewLexemeCount: 1, maxItems: 1 })[0]!;
    const heavy = buildImmersionFeed({ interests, worldTopics: [], dueReviewCount: 0, candidateNewLexemeCount: 50, maxItems: 1 })[0]!;
    expect(heavy.estimatedComprehension).toBeLessThan(light.estimatedComprehension);
  });

  it("returns an empty feed when maxItems is 0", () => {
    expect(buildImmersionFeed({ interests, worldTopics: [], dueReviewCount: 0, candidateNewLexemeCount: 0, maxItems: 0 })).toEqual([]);
  });
});
