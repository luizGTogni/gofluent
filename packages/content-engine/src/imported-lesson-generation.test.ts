import { describe, expect, it } from "vitest";
import { FakeProvider } from "@gofluent/ai";
import { generateImportedLesson, validateImportedLesson, type ImportedLessonRequest } from "./imported-lesson-generation.js";
import type { ImportedLesson } from "@gofluent/ai";

const request: ImportedLessonRequest = {
  language: "en",
  sourceText: "The chef simmered the soup slowly in the kitchen.",
  targetLemmas: ["simmer"],
};

describe("validateImportedLesson", () => {
  it("passes when every target lemma has a vocabulary note", () => {
    const lesson: ImportedLesson = {
      comprehensionQuestions: [{ question: "Where?", options: ["kitchen", "garden"], correctOptionIndex: 0 }],
      vocabularyNotes: [{ lemma: "simmer", explanation: "To cook gently just below boiling." }],
    };
    expect(validateImportedLesson(lesson, request)).toEqual([]);
  });

  it("flags a missing vocabulary note", () => {
    const lesson: ImportedLesson = {
      comprehensionQuestions: [{ question: "Where?", options: ["kitchen", "garden"], correctOptionIndex: 0 }],
      vocabularyNotes: [{ lemma: "chef", explanation: "A professional cook." }],
    };
    const issues = validateImportedLesson(lesson, request);
    expect(issues.some((i) => i.code === "MISSING_VOCABULARY_NOTE")).toBe(true);
  });
});

describe("generateImportedLesson", () => {
  it("returns on the first valid attempt", async () => {
    const provider = new FakeProvider({
      responses: {
        imported_lesson: [{
          comprehensionQuestions: [{ question: "Where?", options: ["kitchen", "garden"], correctOptionIndex: 0 }],
          vocabularyNotes: [{ lemma: "simmer", explanation: "To cook gently." }],
        }],
      },
    });
    const result = await generateImportedLesson(provider, "fake-model", request);
    expect(result.attempts).toBe(1);
    expect(result.promptVersion).toBe("imported-lesson/v1");
  });

  it("retries after a validation failure and succeeds on a later attempt", async () => {
    const provider = new FakeProvider({
      responses: {
        imported_lesson: [
          { comprehensionQuestions: [{ question: "Where?", options: ["kitchen", "garden"], correctOptionIndex: 0 }], vocabularyNotes: [{ lemma: "chef", explanation: "cook" }] },
          { comprehensionQuestions: [{ question: "Where?", options: ["kitchen", "garden"], correctOptionIndex: 0 }], vocabularyNotes: [{ lemma: "simmer", explanation: "To cook gently." }] },
        ],
      },
    });
    const result = await generateImportedLesson(provider, "fake-model", request);
    expect(result.attempts).toBe(2);
  });

  it("throws ContentGenerationError after exhausting retries", async () => {
    const provider = new FakeProvider({
      responses: {
        imported_lesson: [
          { comprehensionQuestions: [{ question: "Where?", options: ["kitchen", "garden"], correctOptionIndex: 0 }], vocabularyNotes: [{ lemma: "chef", explanation: "cook" }] },
          { comprehensionQuestions: [{ question: "Where?", options: ["kitchen", "garden"], correctOptionIndex: 0 }], vocabularyNotes: [{ lemma: "chef", explanation: "cook" }] },
        ],
      },
    });
    await expect(generateImportedLesson(provider, "fake-model", request, { maxAttempts: 2 })).rejects.toThrow(/failed domain validation/);
  });
});
