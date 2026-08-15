import type { Encounter, LearnerItemState } from "@gofluent/core";

const deltas = { SUCCESS: 0.16, PARTIAL: 0.05, FAIL: -0.1, SKIPPED: 0 } as const;
const clamp = (value: number): number => Math.max(0, Math.min(1, value));

/** Pure, modality-sensitive state transition. */
export function updateMastery<T extends LearnerItemState>(previous: T, encounter: Encounter): T {
  const delta = deltas[encounter.result];
  const next = { ...previous, encounters: previous.encounters + 1, updatedAt: encounter.createdAt,
    lastSeenAt: encounter.createdAt };
  if (encounter.result === "SUCCESS") next.lastSuccessAt = encounter.createdAt;
  if (encounter.modality === "LISTENING") {
    next.listeningRecognition = clamp(previous.listeningRecognition + delta);
    next.heardCount = previous.heardCount + 1;
  } else if (encounter.modality === "READING") {
    next.readingRecognition = clamp(previous.readingRecognition + delta);
  } else if (encounter.modality === "RECALL") {
    next.recallScore = clamp(previous.recallScore + delta);
  } else {
    next.recallScore = clamp(previous.recallScore + delta * 0.6);
    next.productiveScore = clamp(previous.productiveScore + delta);
  }
  return next;
}
