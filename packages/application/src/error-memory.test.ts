import { describe, expect, it } from "vitest";
import { openDatabase, runMigrations } from "@gofluent/db";
import { recentErrorSummaries, recordLearnerError } from "./error-memory.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  return db;
}

describe("recordLearnerError", () => {
  it("creates a new error pattern on first occurrence", () => {
    const db = seededDb();
    const error = recordLearnerError(db, {
      learnerId: "u", category: "COLLOCATION", normalizedPattern: "do + mistake",
      exampleOriginal: "I did a mistake.", examplePreferred: "I made a mistake.", now: new Date(now),
    });
    expect(error.occurrences).toBe(1);
    expect(error.severity).toBe(0.5);
  });

  it("aggregates repeated occurrences of the same normalized pattern instead of creating a new row", () => {
    const db = seededDb();
    recordLearnerError(db, { learnerId: "u", category: "COLLOCATION", normalizedPattern: "do + mistake", exampleOriginal: "I did a mistake.", now: new Date(now) });
    const later = "2026-01-02T00:00:00.000Z";
    const second = recordLearnerError(db, { learnerId: "u", category: "COLLOCATION", normalizedPattern: "do + mistake", exampleOriginal: "She did a mistake.", now: new Date(later) });

    expect(second.occurrences).toBe(2);
    expect(second.severity).toBeCloseTo(0.6);
    expect(second.exampleOriginal).toBe("She did a mistake.");

    const rowCount = (db.prepare("SELECT COUNT(*) AS count FROM learner_errors").get() as { count: number }).count;
    expect(rowCount).toBe(1);
  });

  it("keeps distinct categories/patterns as separate rows", () => {
    const db = seededDb();
    recordLearnerError(db, { learnerId: "u", category: "COLLOCATION", normalizedPattern: "do + mistake", now: new Date(now) });
    recordLearnerError(db, { learnerId: "u", category: "GRAMMAR", normalizedPattern: "do + mistake", now: new Date(now) });
    recordLearnerError(db, { learnerId: "u", category: "COLLOCATION", normalizedPattern: "make + photo", now: new Date(now) });

    const rowCount = (db.prepare("SELECT COUNT(*) AS count FROM learner_errors").get() as { count: number }).count;
    expect(rowCount).toBe(3);
  });
});

describe("recentErrorSummaries", () => {
  it("returns summaries suitable for Speak Mode context, most recent first", () => {
    const db = seededDb();
    recordLearnerError(db, { learnerId: "u", category: "COLLOCATION", normalizedPattern: "do + mistake", examplePreferred: "make a mistake", now: new Date("2026-01-01T00:00:00.000Z") });
    recordLearnerError(db, { learnerId: "u", category: "ARTICLE", normalizedPattern: "missing + a", now: new Date("2026-01-02T00:00:00.000Z") });

    const summaries = recentErrorSummaries(db, "u", 5);
    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.normalizedPattern).toBe("missing + a");
    expect(summaries[1]?.examplePreferred).toBe("make a mistake");
  });
});
