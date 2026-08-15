import { describe, expect, it } from "vitest";
import { FakeProvider } from "@gofluent/ai";
import { generateConversationTurn, validateConversationTurn, type ConversationTurnRequest } from "./conversation-generation.js";
import type { ConversationTurn } from "@gofluent/ai";

const request: ConversationTurnRequest = {
  language: "en",
  cefr: "A1",
  scenario: "Ordering coffee at a cafe",
  knownLemmasSample: ["want", "coffee", "please"],
  targetLemmas: ["order"],
  recentErrors: [{ category: "COLLOCATION", normalizedPattern: "do + mistake", examplePreferred: "make a mistake" }],
  history: [],
  learnerMessage: "I want a coffee please.",
};

describe("validateConversationTurn", () => {
  it("passes a short, well-formed reply", () => {
    const turn: ConversationTurn = {
      tutorReply: "Sure! What size would you like?",
      feedback: { good: ["\"I want\" is correct"], corrections: [] },
      detectedErrors: [],
      usedLemmas: ["want", "coffee"],
    };
    expect(validateConversationTurn(turn, request)).toEqual([]);
  });

  it("flags a reply that exceeds the CEFR word bound", () => {
    const longReply = Array.from({ length: 60 }, () => "word").join(" ");
    const turn: ConversationTurn = {
      tutorReply: longReply,
      feedback: { good: [], corrections: [] },
      detectedErrors: [],
      usedLemmas: [],
    };
    const issues = validateConversationTurn(turn, request);
    expect(issues.some((i) => i.code === "REPLY_TOO_LONG")).toBe(true);
  });

  it("flags a trivial (no-op) correction", () => {
    const turn: ConversationTurn = {
      tutorReply: "Great!",
      feedback: { good: [], corrections: [{ original: "a coffee", corrected: "a coffee" }] },
      detectedErrors: [],
      usedLemmas: [],
    };
    const issues = validateConversationTurn(turn, request);
    expect(issues.some((i) => i.code === "TRIVIAL_CORRECTION")).toBe(true);
  });
});

describe("generateConversationTurn", () => {
  it("returns on the first valid attempt", async () => {
    const provider = new FakeProvider({
      responses: {
        conversation_turn: [{
          tutorReply: "Sure! What size would you like?",
          feedback: { good: ["Nice use of \"want\""], corrections: [] },
          detectedErrors: [],
          usedLemmas: ["want", "coffee"],
        }],
      },
    });
    const result = await generateConversationTurn(provider, "fake-model", request);
    expect(result.attempts).toBe(1);
    expect(result.promptVersion).toBe("conversation/v1");
  });

  it("retries after a validation failure and succeeds on a later attempt", async () => {
    const longReply = Array.from({ length: 60 }, () => "word").join(" ");
    const provider = new FakeProvider({
      responses: {
        conversation_turn: [
          { tutorReply: longReply, feedback: { good: [], corrections: [] }, detectedErrors: [], usedLemmas: [] },
          { tutorReply: "Sure! What size?", feedback: { good: [], corrections: [] }, detectedErrors: [], usedLemmas: ["coffee"] },
        ],
      },
    });
    const result = await generateConversationTurn(provider, "fake-model", request);
    expect(result.attempts).toBe(2);
  });

  it("throws ContentGenerationError after exhausting retries", async () => {
    const longReply = Array.from({ length: 60 }, () => "word").join(" ");
    const provider = new FakeProvider({
      responses: {
        conversation_turn: [
          { tutorReply: longReply, feedback: { good: [], corrections: [] }, detectedErrors: [], usedLemmas: [] },
          { tutorReply: longReply, feedback: { good: [], corrections: [] }, detectedErrors: [], usedLemmas: [] },
        ],
      },
    });
    await expect(generateConversationTurn(provider, "fake-model", request, { maxAttempts: 2 })).rejects.toThrow(/failed domain validation/);
  });
});
