import { describe, expect, it } from "vitest";
import { learningValue, lexicalCoverage } from "./learning-value.js";
describe("learning value", () => {
  it("ranks a frequent relevant item above an infrequent irrelevant one", () => expect(learningValue({frequencyRank:10,contextualUsefulness:1,interestRelevance:1,upcomingRelevance:1,memoryNeed:1})).toBeGreaterThan(learningValue({frequencyRank:9000,contextualUsefulness:0,interestRelevance:0,upcomingRelevance:0,memoryNeed:0})));
  it("calculates lexical coverage ratios", () => expect(lexicalCoverage({known:9,review:1,unknown:0})).toEqual({knownRatio:0.9,reviewRatio:0.1,unknownRatio:0}));
});
