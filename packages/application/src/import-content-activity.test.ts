import { describe, expect, it } from "vitest";
import { FakeProvider } from "@gofluent/ai";
import { openDatabase, runMigrations } from "@gofluent/db";
import { importContent } from "./import-content-activity.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  return db;
}

/** generateImportedLesson's Layer-2 validation requires a vocabulary note for
 * every mined candidate lemma, so tests must cover the full unique-token set. */
function queueLesson(provider: FakeProvider, lemmas: string[]): void {
  provider.enqueue("imported_lesson", {
    comprehensionQuestions: [{ question: "Where did this happen?", options: ["a kitchen", "a garden"], correctOptionIndex: 0 }],
    vocabularyNotes: lemmas.map((lemma) => ({ lemma, explanation: `A note about "${lemma}".` })),
  });
}

describe("importContent", () => {
  it("mines new vocabulary, creates lexemes, persists the lesson, and seeds review encounters", async () => {
    const db = seededDb();
    const provider = new FakeProvider();
    // Unique tokens in the source text below: the, zorblax, appeared, in, story.
    queueLesson(provider, ["the", "zorblax", "appeared", "in", "story"]);

    const result = await importContent(db, provider, "fake-model", {
      learnerId: "u", language: "en",
      rawText: "The zorblax zorblax appeared in the story.",
      now: new Date(now),
    });

    expect(result.candidates.some((c) => c.lemma === "zorblax")).toBe(true);
    expect(result.content.contentType).toBe("IMPORTED_TEXT");
    expect(result.content.sourceType).toBe("IMPORTED");
    expect(result.importedContent.contentId).toBe(result.content.id);

    const lexemeRow = db.prepare("SELECT * FROM lexemes WHERE lemma='zorblax'").get() as Record<string, unknown>;
    expect(lexemeRow).toBeDefined();

    const targetRows = db.prepare("SELECT * FROM content_target_items WHERE content_id=?").all(result.content.id) as Array<Record<string, unknown>>;
    expect(targetRows.length).toBeGreaterThan(0);

    const encounterCount = (db.prepare("SELECT COUNT(*) AS count FROM encounters WHERE activity='IMPORTED_CONTENT'").get() as { count: number }).count;
    expect(encounterCount).toBe(targetRows.length);

    const reviewCount = (db.prepare("SELECT COUNT(*) AS count FROM review_queue").get() as { count: number }).count;
    expect(reviewCount).toBe(targetRows.length);

    const importedRow = db.prepare("SELECT * FROM imported_content WHERE id=?").get(result.importedContent.id) as Record<string, unknown>;
    expect(importedRow.raw_text).toBe("The zorblax zorblax appeared in the story.");
  });

  it("links a candidate to an already-known lexeme instead of creating a duplicate", async () => {
    const db = seededDb();
    db.prepare("INSERT INTO lexemes (id,language,lemma,frequency_rank,created_at,updated_at) VALUES (?,?,?,?,?,?)").run("lex_kitchen", "en", "kitchen", 500, now, now);

    const provider = new FakeProvider();
    // Unique tokens: a, kitchen, story.
    queueLesson(provider, ["a", "kitchen", "story"]);

    const result = await importContent(db, provider, "fake-model", {
      learnerId: "u", language: "en", rawText: "A kitchen kitchen kitchen story.", now: new Date(now),
    });

    const lexemeCount = (db.prepare("SELECT COUNT(*) AS count FROM lexemes WHERE lemma='kitchen'").get() as { count: number }).count;
    expect(lexemeCount).toBe(1);

    const targetRows = db.prepare("SELECT * FROM content_target_items WHERE content_id=?").all(result.content.id) as Array<Record<string, unknown>>;
    expect(targetRows.some((r) => r.item_id === "lex_kitchen")).toBe(true);
  });
});
