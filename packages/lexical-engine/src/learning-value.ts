export interface LearningValueInput { frequencyRank?: number; contextualUsefulness: number; interestRelevance: number; upcomingRelevance: number; memoryNeed: number; maxFrequencyRank?: number; }
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
/** Configurable-weight equivalent with balanced Phase 1 defaults. */
export function learningValue(input: LearningValueInput): number {
  const max = input.maxFrequencyRank ?? 10_000;
  const frequency = input.frequencyRank === undefined ? 0.5 : 1 - clamp((input.frequencyRank - 1) / max);
  return clamp(frequency * 0.3 + clamp(input.contextualUsefulness) * 0.2 + clamp(input.interestRelevance) * 0.15 + clamp(input.upcomingRelevance) * 0.15 + clamp(input.memoryNeed) * 0.2);
}

export interface CoverageInput { known: number; review: number; unknown: number; }
export function lexicalCoverage(input: CoverageInput): { knownRatio: number; reviewRatio: number; unknownRatio: number } {
  const total = input.known + input.review + input.unknown;
  return total === 0 ? { knownRatio: 0, reviewRatio: 0, unknownRatio: 0 } : { knownRatio: input.known / total, reviewRatio: input.review / total, unknownRatio: input.unknown / total };
}
