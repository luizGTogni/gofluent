import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "./connection.js";
import { runMigrations } from "../migrations/migrate.js";

describe("openDatabase", () => {
  it("opens a file-backed database and creates its parent directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "gofluent-db-test-"));
    const filePath = join(dir, "nested", "gofluent.db");

    const db = openDatabase(filePath);
    runMigrations(db);

    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
      "user-1",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    );

    const row = db.prepare("SELECT id FROM users WHERE id = ?").get("user-1") as { id: string };
    expect(row.id).toBe("user-1");
  });

  it("supports the append-encounter → update-state transaction pattern", () => {
    const db = openDatabase(":memory:");
    runMigrations(db);

    db.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(
      "user-1",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    );
    db.prepare(
      "INSERT INTO lexemes (id, language, lemma, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("lex-1", "en", "figure out", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");

    db.exec("BEGIN");
    db.prepare(
      `INSERT INTO encounters (id, learner_id, item_type, item_id, modality, activity, result, created_at)
       VALUES ('enc-1', 'user-1', 'LEXEME', 'lex-1', 'READING', 'STORY', 'SUCCESS', '2026-01-01T00:00:00.000Z')`,
    ).run();
    db.prepare(
      `INSERT INTO learner_lexeme_state
         (learner_id, lexeme_id, encounters, reading_recognition, created_at, updated_at)
       VALUES ('user-1', 'lex-1', 1, 0.5, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
    ).run();
    db.exec("COMMIT");

    const state = db
      .prepare("SELECT reading_recognition FROM learner_lexeme_state WHERE learner_id = ? AND lexeme_id = ?")
      .get("user-1", "lex-1") as { reading_recognition: number };

    expect(state.reading_recognition).toBe(0.5);
  });
});
