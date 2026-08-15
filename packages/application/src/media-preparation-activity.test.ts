import { describe, expect, it } from "vitest";
import { openDatabase, runMigrations } from "@gofluent/db";
import { completeMediaPreparationItem, prepareMediaForLearner } from "./media-preparation-activity.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  return db;
}

describe("prepareMediaForLearner", () => {
  it("mines high-value vocabulary, creates lexemes for it, and persists a MediaPreparation row", () => {
    const db = seededDb();
    const result = prepareMediaForLearner(db, {
      learnerId: "u", language: "en", title: "The Office S1E1",
      transcriptExcerpt: "The office is awkward. Apparently everyone shows up late.",
      now: new Date(now),
    });

    expect(result.preparation.title).toBe("The Office S1E1");
    expect(result.preparation.highValueLexemeIds.length).toBeGreaterThan(0);
    expect(result.preparation.preparedCount).toBe(0);

    const row = db.prepare("SELECT * FROM media_preparation WHERE id=?").get(result.preparation.id) as Record<string, unknown>;
    expect(row.title).toBe("The Office S1E1");

    const lexemeCount = (db.prepare("SELECT COUNT(*) AS count FROM lexemes").get() as { count: number }).count;
    expect(lexemeCount).toBe(result.preparation.highValueLexemeIds.length);
  });

  it("does not call any AI provider (fully deterministic)", () => {
    const db = seededDb();
    // No FakeProvider queue set up at all — if this needed a provider call it would throw.
    expect(() =>
      prepareMediaForLearner(db, { learnerId: "u", language: "en", title: "t", transcriptExcerpt: "zorblax zorblax", now: new Date(now) }),
    ).not.toThrow();
  });
});

describe("completeMediaPreparationItem", () => {
  it("registers an encounter and increments preparedCount", () => {
    const db = seededDb();
    const { preparation } = prepareMediaForLearner(db, {
      learnerId: "u", language: "en", title: "t", transcriptExcerpt: "zorblax appeared suddenly", now: new Date(now),
    });
    const lexemeId = preparation.highValueLexemeIds[0]!;

    const updated = completeMediaPreparationItem(db, { learnerId: "u", preparation, lexemeId, result: "SUCCESS", now: new Date(now) });

    expect(updated.preparedCount).toBe(1);
    const encounterCount = (db.prepare("SELECT COUNT(*) AS count FROM encounters WHERE activity='MEDIA_PREP'").get() as { count: number }).count;
    expect(encounterCount).toBe(1);
  });
});
