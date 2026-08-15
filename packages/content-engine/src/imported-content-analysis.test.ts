import { describe, expect, it } from "vitest";
import { analyzeImportedText, type ExistingLexemeInfo } from "./imported-content-analysis.js";

describe("analyzeImportedText", () => {
  it("classifies known vs unknown tokens and computes an unknown-ratio difficulty", () => {
    const result = analyzeImportedText({
      text: "The cat sat on the zorblax mat.",
      knownLemmas: ["the", "cat", "sat", "on", "mat"],
      existingLexemes: new Map(),
    });

    // Tokens: the, cat, sat, on, the, zorblax, mat = 7; only "zorblax" is unknown.
    expect(result.coverage.unknownRatio).toBeCloseTo(1 / 7);
    expect(result.estimatedDifficulty).toBeCloseTo(1 / 7);
    expect(result.candidates.map((c) => c.lemma)).toContain("zorblax");
  });

  it("prioritizes higher learning-value candidates and respects maxCandidates", () => {
    const existingLexemes = new Map<string, ExistingLexemeInfo>([
      ["rare", { id: "lex_rare", frequencyRank: 9000 }],
      ["common", { id: "lex_common", frequencyRank: 50 }],
    ]);
    const result = analyzeImportedText({
      text: "rare rare common word",
      knownLemmas: [],
      existingLexemes,
      maxCandidates: 2,
    });

    expect(result.candidates).toHaveLength(2);
    // learningValue rewards frequent/common vocabulary (low frequencyRank) over rare
    // words, so "common" outranks "rare" despite "rare" appearing twice.
    expect(result.candidates[0]?.lemma).toBe("common");
    expect(result.candidates[0]?.existingLexemeId).toBe("lex_common");
  });

  it("links candidates to existing lexemes instead of treating them as brand-new", () => {
    const existingLexemes = new Map<string, ExistingLexemeInfo>([["kitchen", { id: "lex_kitchen" }]]);
    const result = analyzeImportedText({ text: "kitchen kitchen", knownLemmas: [], existingLexemes });
    expect(result.candidates[0]?.existingLexemeId).toBe("lex_kitchen");
  });

  it("returns zero coverage for empty text", () => {
    const result = analyzeImportedText({ text: "", knownLemmas: [], existingLexemes: new Map() });
    expect(result.coverage).toEqual({ knownRatio: 0, unknownRatio: 0 });
    expect(result.candidates).toEqual([]);
  });
});
