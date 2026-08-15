import { describe, expect, it } from "vitest";
import { openDatabase } from "../sqlite/connection.js";
import { runMigrations } from "./migrate.js";

const EXPECTED_TABLES = [
  "users",
  "learner_profiles",
  "learner_interests",
  "lexemes",
  "lexeme_forms",
  "chunks",
  "learner_lexeme_state",
  "learner_chunk_state",
  "encounters",
  "review_queue",
  "content",
  "content_target_items",
  "learning_sessions",
  "session_activities",
  "settings",
  "schema_migrations",
  "audio_assets",
  "learner_errors",
];

describe("runMigrations", () => {
  it("creates all vertical-slice tables from 0001_initial.sql, 0002_audio_assets.sql, and 0003_learner_errors.sql", () => {
    const db = openDatabase(":memory:");
    const applied = runMigrations(db);

    expect(applied).toEqual(["0001_initial", "0002_audio_assets", "0003_learner_errors"]);

    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as Array<{ name: string }>;
    const tableNames = rows.map((row) => row.name);

    for (const table of EXPECTED_TABLES) {
      expect(tableNames).toContain(table);
    }
  });

  it("is idempotent — re-running applies nothing new", () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    const second = runMigrations(db);
    expect(second).toEqual([]);
  });

  it("enables foreign key enforcement", () => {
    const db = openDatabase(":memory:");
    const row = db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number };
    expect(row.foreign_keys).toBe(1);
  });

  it("rejects an encounter referencing a non-existent learner", () => {
    const db = openDatabase(":memory:");
    runMigrations(db);

    expect(() =>
      db
        .prepare(
          `INSERT INTO encounters
             (id, learner_id, item_type, item_id, modality, activity, result, created_at)
           VALUES ('e1', 'missing-user', 'LEXEME', 'lex1', 'READING', 'STORY', 'SUCCESS', '2026-01-01T00:00:00.000Z')`,
        )
        .run(),
    ).toThrow();
  });
});
