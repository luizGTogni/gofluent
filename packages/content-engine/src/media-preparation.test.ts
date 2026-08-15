import { describe, expect, it } from "vitest";
import { prepareMedia } from "./media-preparation.js";
import type { ExistingLexemeInfo } from "./imported-content-analysis.js";

describe("prepareMedia", () => {
  it("estimates comprehension as 1 - unknownRatio and surfaces high-value candidates", () => {
    const result = prepareMedia({
      title: "The Office S1E1",
      transcriptExcerpt: "The office is awkward. Apparently everyone is awkward here.",
      knownLemmas: ["the", "office", "is", "everyone", "here"],
      existingLexemes: new Map<string, ExistingLexemeInfo>(),
    });

    expect(result.title).toBe("The Office S1E1");
    expect(result.estimatedComprehension).toBeGreaterThan(0);
    expect(result.estimatedComprehension).toBeLessThan(1);
    expect(result.highValueItems.map((c) => c.lemma)).toContain("awkward");
    expect(result.highValueItems.map((c) => c.lemma)).toContain("apparently");
  });

  it("caps candidates at maxHighValueItems and estimates prep minutes from the count", () => {
    const result = prepareMedia({
      title: "t",
      transcriptExcerpt: "alpha beta gamma delta epsilon zeta eta theta",
      knownLemmas: [],
      existingLexemes: new Map(),
      maxHighValueItems: 4,
    });

    expect(result.highValueItems).toHaveLength(4);
    expect(result.estimatedPrepMinutes).toBe(1);
  });

  it("returns zero prep minutes when everything is already known", () => {
    const result = prepareMedia({
      title: "t", transcriptExcerpt: "the cat sat", knownLemmas: ["the", "cat", "sat"], existingLexemes: new Map(),
    });
    expect(result.highValueItems).toEqual([]);
    expect(result.estimatedPrepMinutes).toBe(0);
    expect(result.estimatedComprehension).toBe(1);
  });
});
