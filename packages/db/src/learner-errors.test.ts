import { describe, expect, it } from "vitest";
import type { LearnerError } from "@gofluent/core";
import { openDatabase } from "./sqlite/connection.js";
import { runMigrations } from "./migrations/migrate.js";
import { SqliteLearnerErrorRepository } from "./repositories.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  return db;
}

describe("SqliteLearnerErrorRepository", () => {
  it("upserts a new error pattern and aggregates repeated occurrences via the unique pattern index", () => {
    const db = seededDb();
    const repo = new SqliteLearnerErrorRepository(db);

    const first: LearnerError = {
      id: "err1", learnerId: "u", category: "COLLOCATION", normalizedPattern: "do + mistake",
      exampleOriginal: "I did a mistake.", examplePreferred: "I made a mistake.",
      occurrences: 1, severity: 0.5, firstSeenAt: now, lastSeenAt: now, createdAt: now, updatedAt: now,
    };
    repo.upsert(first);

    const later = "2026-01-02T00:00:00.000Z";
    repo.upsert({ ...first, exampleOriginal: "She did a mistake.", occurrences: 2, lastSeenAt: later, updatedAt: later });

    const stored = repo.findByPattern("u", "COLLOCATION", "do + mistake");
    expect(stored?.occurrences).toBe(2);
    expect(stored?.exampleOriginal).toBe("She did a mistake.");
    expect(stored?.firstSeenAt).toBe(now);

    const all = db.prepare("SELECT COUNT(*) as count FROM learner_errors WHERE learner_id='u'").get() as { count: number };
    expect(all.count).toBe(1);
  });

  it("lists errors most-recently-seen first", () => {
    const db = seededDb();
    const repo = new SqliteLearnerErrorRepository(db);
    repo.upsert({ id: "e1", learnerId: "u", category: "GRAMMAR", normalizedPattern: "a", occurrences: 1, severity: 0.5, firstSeenAt: now, lastSeenAt: "2026-01-01T00:00:00.000Z", createdAt: now, updatedAt: now });
    repo.upsert({ id: "e2", learnerId: "u", category: "GRAMMAR", normalizedPattern: "b", occurrences: 1, severity: 0.5, firstSeenAt: now, lastSeenAt: "2026-01-03T00:00:00.000Z", createdAt: now, updatedAt: now });

    const recent = repo.listRecent("u", 10);
    expect(recent.map((e) => e.normalizedPattern)).toEqual(["b", "a"]);
  });
});
