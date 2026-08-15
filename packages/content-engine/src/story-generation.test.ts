import { describe, expect, it } from "vitest";
import { FakeProvider } from "@gofluent/ai";
import { computeStoryCoverage, generateStory, validateStory, type StoryGenerationRequest } from "./story-generation.js";
import type { Story } from "@gofluent/ai";

const request: StoryGenerationRequest = {
  language: "en",
  topic: "cooking",
  cefr: "A2",
  knownLemmas: ["the", "a", "is", "cook", "kitchen"],
  newTargetLemmas: ["simmer"],
  reviewTargetLemmas: ["kitchen"],
  maxUnknownRatio: 0.5,
};

describe("validateStory", () => {
  it("passes a story that covers target items and stays within the unknown ratio", () => {
    const story: Story = {
      title: "In the Kitchen",
      text: "The cook is in the kitchen. She likes to simmer a soup slowly.",
      targetItems: ["simmer", "kitchen"],
      comprehensionQuestions: [{ question: "Where is she?", options: ["kitchen", "garden"], correctOptionIndex: 0 }],
    };
    expect(validateStory(story, request)).toEqual([]);
  });

  it("flags a missing new target item", () => {
    const story: Story = {
      title: "In the Kitchen",
      text: "The cook is in the kitchen.",
      targetItems: ["simmer", "kitchen"],
      comprehensionQuestions: [{ question: "Where is she?", options: ["kitchen", "garden"], correctOptionIndex: 0 }],
    };
    const issues = validateStory(story, request);
    expect(issues.some((i) => i.code === "MISSING_TARGET_ITEM")).toBe(true);
  });

  it("flags an unlisted target item", () => {
    const story: Story = {
      title: "In the Kitchen",
      text: "The cook likes to simmer a soup in the kitchen.",
      targetItems: ["kitchen"],
      comprehensionQuestions: [{ question: "Where is she?", options: ["kitchen", "garden"], correctOptionIndex: 0 }],
    };
    const issues = validateStory(story, request);
    expect(issues.some((i) => i.code === "MISSING_TARGET_ITEM_LISTING")).toBe(true);
  });

  it("flags an unknown-vocabulary ratio above the bound", () => {
    const strict: StoryGenerationRequest = { ...request, maxUnknownRatio: 0.01 };
    const story: Story = {
      title: "Zorblax",
      text: "Zorblax quibnor flimtastic wobbulate simmer kitchen.",
      targetItems: ["simmer", "kitchen"],
      comprehensionQuestions: [{ question: "?", options: ["a", "b"], correctOptionIndex: 0 }],
    };
    const issues = validateStory(story, strict);
    expect(issues.some((i) => i.code === "UNKNOWN_RATIO_EXCEEDED")).toBe(true);
  });
});

describe("computeStoryCoverage", () => {
  it("classifies tokens as known/review-target/unknown", () => {
    const story: Story = {
      title: "t",
      text: "cook cook simmer zorblax",
      targetItems: ["simmer"],
      comprehensionQuestions: [{ question: "?", options: ["a", "b"], correctOptionIndex: 0 }],
    };
    const coverage = computeStoryCoverage(story, request);
    expect(coverage.knownRatio).toBeCloseTo(2 / 4);
    expect(coverage.reviewRatio).toBeCloseTo(1 / 4);
    expect(coverage.unknownRatio).toBeCloseTo(1 / 4);
  });
});

describe("generateStory", () => {
  it("returns on the first valid attempt", async () => {
    const provider = new FakeProvider({
      responses: {
        story: [{
          title: "In the Kitchen",
          text: "The cook is in the kitchen. She likes to simmer a soup slowly.",
          targetItems: ["simmer", "kitchen"],
          comprehensionQuestions: [{ question: "Where is she?", options: ["kitchen", "garden"], correctOptionIndex: 0 }],
        }],
      },
    });
    const result = await generateStory(provider, "fake-model", request);
    expect(result.attempts).toBe(1);
    expect(result.promptVersion).toBe("story/v1");
  });

  it("retries after a validation failure and succeeds on a later attempt", async () => {
    const provider = new FakeProvider({
      responses: {
        story: [
          {
            title: "In the Kitchen",
            text: "The cook is in the kitchen.",
            targetItems: ["simmer", "kitchen"],
            comprehensionQuestions: [{ question: "Where is she?", options: ["kitchen", "garden"], correctOptionIndex: 0 }],
          },
          {
            title: "In the Kitchen",
            text: "The cook is in the kitchen. She likes to simmer a soup slowly.",
            targetItems: ["simmer", "kitchen"],
            comprehensionQuestions: [{ question: "Where is she?", options: ["kitchen", "garden"], correctOptionIndex: 0 }],
          },
        ],
      },
    });
    const result = await generateStory(provider, "fake-model", request);
    expect(result.attempts).toBe(2);
  });

  it("throws ContentGenerationError after exhausting retries", async () => {
    const provider = new FakeProvider({
      responses: {
        story: [
          { title: "t", text: "no target words here", targetItems: ["simmer", "kitchen"], comprehensionQuestions: [{ question: "?", options: ["a", "b"], correctOptionIndex: 0 }] },
          { title: "t", text: "no target words here", targetItems: ["simmer", "kitchen"], comprehensionQuestions: [{ question: "?", options: ["a", "b"], correctOptionIndex: 0 }] },
        ],
      },
    });
    await expect(generateStory(provider, "fake-model", request, { maxAttempts: 2 })).rejects.toThrow(/failed domain validation/);
  });
});
