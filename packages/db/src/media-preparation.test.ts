import { describe, expect, it } from "vitest";
import type { MediaPreparation } from "@gofluent/core";
import { openDatabase } from "./sqlite/connection.js";
import { runMigrations } from "./migrations/migrate.js";
import { SqliteMediaPreparationRepository } from "./repositories.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  return db;
}

describe("SqliteMediaPreparationRepository", () => {
  it("upserts and reads back a preparation record", () => {
    const db = seededDb();
    const repo = new SqliteMediaPreparationRepository(db);

    const record: MediaPreparation = {
      id: "mp1", learnerId: "u", title: "The Office S1E1", transcriptExcerpt: "Some transcript excerpt.",
      language: "en", estimatedComprehension: 0.87, highValueLexemeIds: ["lex_a", "lex_b"], preparedCount: 0,
      createdAt: now, updatedAt: now,
    };
    repo.upsert(record);

    const stored = repo.get("mp1");
    expect(stored?.title).toBe("The Office S1E1");
    expect(stored?.highValueLexemeIds).toEqual(["lex_a", "lex_b"]);
    expect(stored?.preparedCount).toBe(0);
  });

  it("tracks preparedCount as items are drilled", () => {
    const db = seededDb();
    const repo = new SqliteMediaPreparationRepository(db);
    repo.upsert({ id: "mp1", learnerId: "u", title: "t", transcriptExcerpt: "x", language: "en", estimatedComprehension: 0.5, highValueLexemeIds: ["a", "b"], preparedCount: 0, createdAt: now, updatedAt: now });
    repo.upsert({ id: "mp1", learnerId: "u", title: "t", transcriptExcerpt: "x", language: "en", estimatedComprehension: 0.5, highValueLexemeIds: ["a", "b"], preparedCount: 1, createdAt: now, updatedAt: "2026-01-02T00:00:00.000Z" });

    expect(repo.get("mp1")?.preparedCount).toBe(1);
  });

  it("lists a learner's preparations most-recent first", () => {
    const db = seededDb();
    const repo = new SqliteMediaPreparationRepository(db);
    repo.upsert({ id: "mp1", learnerId: "u", title: "a", transcriptExcerpt: "x", language: "en", estimatedComprehension: 0.5, highValueLexemeIds: [], preparedCount: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    repo.upsert({ id: "mp2", learnerId: "u", title: "b", transcriptExcerpt: "x", language: "en", estimatedComprehension: 0.5, highValueLexemeIds: [], preparedCount: 0, createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" });

    expect(repo.listByLearner("u", 10).map((r) => r.id)).toEqual(["mp2", "mp1"]);
  });
});
