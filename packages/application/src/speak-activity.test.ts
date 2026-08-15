import { describe, expect, it } from "vitest";
import { FakeProvider } from "@gofluent/ai";
import { openDatabase, runMigrations } from "@gofluent/db";
import { submitConversationTurn } from "./speak-activity.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
  db.prepare("INSERT INTO lexemes (id,language,lemma,created_at,updated_at) VALUES (?,?,?,?,?)").run("lex_order", "en", "order", now, now);
  db.prepare("INSERT INTO lexeme_forms (id,lexeme_id,form,normalized_form) VALUES (?,?,?,?)").run("f1", "lex_order", "order", "order");
  return db;
}

describe("submitConversationTurn", () => {
  it("generates a turn, records used-lemma encounters, and records detected errors atomically", async () => {
    const db = seededDb();
    const provider = new FakeProvider({
      responses: {
        conversation_turn: [{
          tutorReply: "Sure, what would you like to order?",
          feedback: { good: ["Nice greeting"], corrections: [{ original: "I wants", corrected: "I want" }] },
          detectedErrors: [{ category: "GRAMMAR", original: "I wants", preferred: "I want", normalizedPattern: "want + s" }],
          usedLemmas: ["order"],
        }],
      },
    });

    const result = await submitConversationTurn(db, provider, "fake-model", {
      learnerId: "u", language: "en", cefr: "A2", scenario: "Ordering coffee",
      knownLemmasSample: ["coffee", "want"], targetLemmas: ["order"],
      history: [], learnerMessage: "I wants a coffee.", now: new Date(now),
    });

    expect(result.turn.tutorReply).toContain("order");
    expect(result.matchedLemmaCount).toBe(1);
    expect(result.recordedErrors).toHaveLength(1);

    const encounterCount = (db.prepare("SELECT COUNT(*) AS count FROM encounters WHERE activity='CONVERSATION'").get() as { count: number }).count;
    expect(encounterCount).toBe(1);

    const errorRow = db.prepare("SELECT * FROM learner_errors WHERE learner_id='u'").get() as Record<string, unknown>;
    expect(errorRow.normalized_pattern).toBe("want + s");
    expect(errorRow.occurrences).toBe(1);
  });

  it("aggregates the same recurring error across two turns into one row", async () => {
    const db = seededDb();
    const provider = new FakeProvider({
      responses: {
        conversation_turn: [
          {
            tutorReply: "Okay!",
            feedback: { good: [], corrections: [] },
            detectedErrors: [{ category: "GRAMMAR", original: "I wants", preferred: "I want", normalizedPattern: "want + s" }],
            usedLemmas: [],
          },
          {
            tutorReply: "Got it.",
            feedback: { good: [], corrections: [] },
            detectedErrors: [{ category: "GRAMMAR", original: "she wants", preferred: "she wants", normalizedPattern: "want + s" }],
            usedLemmas: [],
          },
        ],
      },
    });

    await submitConversationTurn(db, provider, "fake-model", {
      learnerId: "u", language: "en", cefr: "A2", scenario: "Ordering coffee",
      knownLemmasSample: [], targetLemmas: [], history: [], learnerMessage: "I wants a coffee.", now: new Date(now),
    });
    await submitConversationTurn(db, provider, "fake-model", {
      learnerId: "u", language: "en", cefr: "A2", scenario: "Ordering coffee",
      knownLemmasSample: [], targetLemmas: [], history: [], learnerMessage: "She wants a coffee.", now: new Date("2026-01-02T00:00:00.000Z"),
    });

    const rows = db.prepare("SELECT * FROM learner_errors WHERE learner_id='u'").all() as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.occurrences).toBe(2);
  });
});
