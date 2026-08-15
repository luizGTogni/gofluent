import { describe, expect, it } from "vitest";
import { openDatabase, runMigrations, seedInitialLexemes, seedWorlds, SqliteLexemeRepository, SqliteWorldRepository } from "@gofluent/db";
import { getImmersionFeed } from "./immersion-feed.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  seedInitialLexemes(new SqliteLexemeRepository(db), now);
  seedWorlds(new SqliteWorldRepository(db), now);
  return db;
}

describe("getImmersionFeed", () => {
  it("assembles a feed using real interests, world topics, due reviews, and unlearned lexeme counts", () => {
    const db = seededDb();
    db.prepare("INSERT INTO learner_interests (id,user_id,interest,weight,created_at) VALUES (?,?,?,?,?)").run("i1", "u", "cooking", 1.0, now);

    const feed = getImmersionFeed(db, "u", "en", new Date(now));
    expect(feed).toHaveLength(5);
    expect(feed[0]?.topic).toBe("cooking");
    // All 4 seeded lexemes are unlearned for a fresh user.
    expect(feed.reduce((sum, i) => sum + i.newVocabularyCount, 0)).toBe(4);
  });

  it("falls back to world names when the learner has no interests yet", () => {
    const db = seededDb();
    const feed = getImmersionFeed(db, "u", "en", new Date(now), 3);
    expect(feed.map((i) => i.topic)).toEqual(["Everyday Life", "Travel", "Technology"]);
  });
});
