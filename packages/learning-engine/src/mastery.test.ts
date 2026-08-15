import { describe, expect, it } from "vitest";
import type { Encounter, LearnerLexemeState } from "@gofluent/core";
import { updateMastery } from "./mastery.js";

const state: LearnerLexemeState = { learnerId:"u", itemId:"l", lexemeId:"l", encounters:0, heardCount:0, readingRecognition:0.2, listeningRecognition:0.2, recallScore:0.2, productiveScore:0.2, createdAt:"2026-01-01T00:00:00.000Z", updatedAt:"2026-01-01T00:00:00.000Z" };
const encounter = (modality: Encounter["modality"]): Encounter => ({ id:"e",learnerId:"u",itemType:"LEXEME",itemId:"l",modality,activity:"REVIEW",result:"SUCCESS",assistanceUsed:false,createdAt:"2026-01-02T00:00:00.000Z" });
describe("updateMastery", () => {
  it("keeps recognition from inflating productive knowledge", () => { const next = updateMastery(state, encounter("READING")); expect(next.readingRecognition).toBeGreaterThan(state.readingRecognition); expect(next.productiveScore).toBe(state.productiveScore); });
  it("updates listening evidence and heard count", () => { const next = updateMastery(state, encounter("LISTENING")); expect(next.listeningRecognition).toBeGreaterThan(state.listeningRecognition); expect(next.heardCount).toBe(1); });
  it("updates productive and recall knowledge from writing", () => { const next = updateMastery(state, encounter("WRITING")); expect(next.productiveScore).toBeGreaterThan(state.productiveScore); expect(next.recallScore).toBeGreaterThan(state.recallScore); });
});
