import type { EncounterResult, LearnerItemState } from "@gofluent/core";

export interface ReviewScheduleInput { state: LearnerItemState; learningValue: number; result: EncounterResult; now: Date; }
export interface ReviewScheduleResult { nextReviewAt: string; priority: number; reason: string; }
const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export function scheduleReview(input: ReviewScheduleInput): ReviewScheduleResult {
  const { state, learningValue, result, now } = input;
  const mastery = (state.readingRecognition + state.listeningRecognition + state.recallScore + state.productiveScore) / 4;
  const weakness = 1 - mastery;
  const overdueDays = state.nextReviewAt ? Math.max(0, (now.getTime() - Date.parse(state.nextReviewAt)) / 86_400_000) : 0;
  const priority = clamp(weakness * clamp(learningValue) * (1 + Math.min(overdueDays / 7, 1)));
  const baseDays = result === "SUCCESS" ? 1 + Math.round(mastery * 13) : result === "PARTIAL" ? 1 : 0;
  const due = new Date(now.getTime() + baseDays * 86_400_000);
  return { nextReviewAt: due.toISOString(), priority, reason: result === "SUCCESS" ? "reinforce growing mastery" : "repair weak memory" };
}
