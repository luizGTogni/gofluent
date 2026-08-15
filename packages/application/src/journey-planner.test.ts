import { describe, expect, it } from "vitest";
import { planDailyJourney } from "./journey-planner.js";

const now = "2026-01-01T00:00:00.000Z";

describe("planDailyJourney", () => {
  it("is pure and deterministic given the same input", () => {
    const input = {
      dueReviewItems: [
        { id: "r1", learnerId: "u", itemType: "LEXEME" as const, itemId: "l1", dueAt: now, priority: 0.8, schedulingVersion: "v1", createdAt: now, updatedAt: now },
        { id: "r2", learnerId: "u", itemType: "LEXEME" as const, itemId: "l2", dueAt: now, priority: 0.2, schedulingVersion: "v1", createdAt: now, updatedAt: now },
      ],
      candidateNewLexemes: [
        { id: "n1", language: "en", lemma: "new1", frequencyRank: 500, forms: ["new1"], createdAt: now, updatedAt: now },
        { id: "n2", language: "en", lemma: "new2", frequencyRank: 100, forms: ["new2"], createdAt: now, updatedAt: now },
      ],
      recentlySeenItemIds: [],
      interests: [
        { id: "i1", userId: "u", interest: "travel", weight: 0.5, createdAt: now },
        { id: "i2", userId: "u", interest: "cooking", weight: 0.9, createdAt: now },
      ],
      dailyMinutes: 20,
      newItemBudget: 1,
    };

    const first = planDailyJourney(input);
    const second = planDailyJourney(input);
    expect(first).toEqual(second);
  });

  it("orders review items by priority and caps to the review capacity", () => {
    const plan = planDailyJourney({
      dueReviewItems: [
        { id: "r1", learnerId: "u", itemType: "LEXEME", itemId: "low", dueAt: now, priority: 0.1, schedulingVersion: "v1", createdAt: now, updatedAt: now },
        { id: "r2", learnerId: "u", itemType: "LEXEME", itemId: "high", dueAt: now, priority: 0.9, schedulingVersion: "v1", createdAt: now, updatedAt: now },
      ],
      candidateNewLexemes: [],
      recentlySeenItemIds: [],
      interests: [],
      dailyMinutes: 20,
      newItemBudget: 0,
      maxReviewItems: 1,
    });
    expect(plan.reviewItemIds).toEqual(["high"]);
  });

  it("picks new lexemes by lowest frequency rank, excluding recently seen items", () => {
    const plan = planDailyJourney({
      dueReviewItems: [],
      candidateNewLexemes: [
        { id: "a", language: "en", lemma: "a", frequencyRank: 50, forms: ["a"], createdAt: now, updatedAt: now },
        { id: "b", language: "en", lemma: "b", frequencyRank: 10, forms: ["b"], createdAt: now, updatedAt: now },
      ],
      recentlySeenItemIds: ["b"],
      interests: [],
      dailyMinutes: 20,
      newItemBudget: 5,
    });
    expect(plan.newLexemeIds).toEqual(["a"]);
  });

  it("chooses the highest-weight interest as the story topic, defaulting when none given", () => {
    const withInterest = planDailyJourney({
      dueReviewItems: [], candidateNewLexemes: [], recentlySeenItemIds: [],
      interests: [{ id: "i", userId: "u", interest: "space", weight: 1, createdAt: now }],
      dailyMinutes: 20, newItemBudget: 0,
    });
    expect(withInterest.storyTopic).toBe("space");

    const withoutInterest = planDailyJourney({
      dueReviewItems: [], candidateNewLexemes: [], recentlySeenItemIds: [], interests: [],
      dailyMinutes: 20, newItemBudget: 0,
    });
    expect(withoutInterest.storyTopic).toBe("everyday life");
  });

  it("includes REVIEW only when there are due items", () => {
    const withReview = planDailyJourney({
      dueReviewItems: [{ id: "r", learnerId: "u", itemType: "LEXEME", itemId: "l", dueAt: now, priority: 0.5, schedulingVersion: "v1", createdAt: now, updatedAt: now }],
      candidateNewLexemes: [], recentlySeenItemIds: [], interests: [], dailyMinutes: 20, newItemBudget: 0,
    });
    expect(withReview.activities).toEqual(["REVIEW", "STORY", "RECAP"]);

    const withoutReview = planDailyJourney({
      dueReviewItems: [], candidateNewLexemes: [], recentlySeenItemIds: [], interests: [], dailyMinutes: 20, newItemBudget: 0,
    });
    expect(withoutReview.activities).toEqual(["STORY", "RECAP"]);
  });
});
