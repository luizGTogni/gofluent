import { describe, expect, it } from "vitest";
import { FakeProvider } from "@gofluent/ai";
import { openDatabase, runMigrations } from "@gofluent/db";
import { completeListeningEncounter, generateBlindListeningContent } from "./blind-listening-activity.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  db.prepare("INSERT INTO lexemes (id,language,lemma,created_at,updated_at) VALUES (?,?,?,?,?)").run("lex_travel", "en", "travel", now, now);
  return db;
}

describe("generateBlindListeningContent", () => {
  it("generates and persists a story without touching learning_sessions/session_activities", async () => {
    const db = seededDb();
    const provider = new FakeProvider({
      responses: {
        story: [{
          title: "A Trip Abroad", text: "She loves to travel every summer.",
          targetItems: ["travel"], comprehensionQuestions: [{ question: "What does she love?", options: ["travel", "cook"], correctOptionIndex: 0 }],
        }],
      },
    });

    const content = await generateBlindListeningContent(db, provider, "fake-model", {
      learnerId: "u", language: "en", topic: "travel", cefr: "A2", knownLemmas: ["she", "loves", "to", "every", "summer", "travel"],
    }, new Date(now));

    expect(content.title).toBe("A Trip Abroad");
    expect(content.contentType).toBe("STORY");

    const contentRow = db.prepare("SELECT * FROM content WHERE id=?").get(content.id) as Record<string, unknown>;
    expect(contentRow.status).toBe("VALID");
    const sessionCount = (db.prepare("SELECT COUNT(*) AS count FROM learning_sessions").get() as { count: number }).count;
    expect(sessionCount).toBe(0);
  });
});

describe("completeListeningEncounter", () => {
  it("registers a LISTENING/LISTENING encounter tied to the debrief content", () => {
    const db = seededDb();
    completeListeningEncounter(db, { learnerId: "u", lexemeId: "lex_travel", result: "SUCCESS", now: new Date(now) });

    const row = db.prepare("SELECT * FROM encounters WHERE learner_id='u'").get() as Record<string, unknown>;
    expect(row.modality).toBe("LISTENING");
    expect(row.activity).toBe("LISTENING");
  });
});
