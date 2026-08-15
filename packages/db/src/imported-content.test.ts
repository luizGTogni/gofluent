import { describe, expect, it } from "vitest";
import type { ImportedContent } from "@gofluent/core";
import { openDatabase } from "./sqlite/connection.js";
import { runMigrations } from "./migrations/migrate.js";
import { SqliteImportedContentRepository } from "./repositories.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  return db;
}

describe("SqliteImportedContentRepository", () => {
  it("upserts and reads back an imported-content record", () => {
    const db = seededDb();
    const repo = new SqliteImportedContentRepository(db);

    const record: ImportedContent = {
      id: "ic1", learnerId: "u", title: "My article", rawText: "Some raw imported text.", language: "en",
      estimatedDifficulty: 0.4, knownRatio: 0.6, unknownRatio: 0.4, createdAt: now, updatedAt: now,
    };
    repo.upsert(record);

    const stored = repo.get("ic1");
    expect(stored?.rawText).toBe("Some raw imported text.");
    expect(stored?.unknownRatio).toBe(0.4);
    expect(stored?.contentId).toBeUndefined();
  });

  it("links to a generated content row after the lesson is created", () => {
    const db = seededDb();
    const repo = new SqliteImportedContentRepository(db);
    repo.upsert({ id: "ic1", learnerId: "u", rawText: "text", language: "en", createdAt: now, updatedAt: now });

    db.prepare("INSERT INTO content (id,content_type,language,source_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run("content-1", "IMPORTED_TEXT", "en", "IMPORTED", "VALID", now, now);

    const later = "2026-01-02T00:00:00.000Z";
    repo.upsert({ id: "ic1", learnerId: "u", contentId: "content-1", rawText: "text", language: "en", createdAt: now, updatedAt: later });

    expect(repo.get("ic1")?.contentId).toBe("content-1");
  });

  it("lists a learner's imports most-recent first", () => {
    const db = seededDb();
    const repo = new SqliteImportedContentRepository(db);
    repo.upsert({ id: "ic1", learnerId: "u", rawText: "a", language: "en", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    repo.upsert({ id: "ic2", learnerId: "u", rawText: "b", language: "en", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" });

    const listed = repo.listByLearner("u", 10);
    expect(listed.map((r) => r.id)).toEqual(["ic2", "ic1"]);
  });
});
