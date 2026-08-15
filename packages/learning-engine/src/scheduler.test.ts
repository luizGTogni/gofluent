import { describe, expect, it } from "vitest";
import type { LearnerLexemeState } from "@gofluent/core";
import { scheduleReview } from "./scheduler.js";
const weak: LearnerLexemeState = { learnerId:"u",itemId:"l",lexemeId:"l",encounters:0,heardCount:0,readingRecognition:0,listeningRecognition:0,recallScore:0,productiveScore:0,createdAt:"2026-01-01T00:00:00.000Z",updatedAt:"2026-01-01T00:00:00.000Z" };
describe("scheduleReview", () => it("prioritizes weak, valuable items", () => { const now = new Date("2026-01-01T00:00:00.000Z"); const high = scheduleReview({ state:weak, learningValue:1, result:"FAIL", now }); const low = scheduleReview({ state:{...weak,readingRecognition:1,listeningRecognition:1,recallScore:1,productiveScore:1}, learningValue:0.1, result:"SUCCESS", now }); expect(high.priority).toBeGreaterThan(low.priority); expect(high.nextReviewAt).toBe(now.toISOString()); }));
