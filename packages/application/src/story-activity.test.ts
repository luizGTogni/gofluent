import { describe, expect, it } from "vitest";
import { FakeProvider } from "@gofluent/ai";
import { openDatabase, runMigrations } from "@gofluent/db";
import type { SessionActivity } from "@gofluent/core";
import { generateStoryActivity } from "./story-activity.js";

const now = "2026-01-01T00:00:00.000Z";

describe("generateStoryActivity", () => {
  it("generates, validates, and persists a story with its target items", async () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u", now, now);
    db.prepare("INSERT INTO lexemes (id,language,lemma,created_at,updated_at) VALUES (?,?,?,?,?)").run("lex_simmer", "en", "simmer", now, now);
    db.prepare("INSERT INTO learning_sessions (id,learner_id,session_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?)").run("s1", "u", "DAILY_JOURNEY", "IN_PROGRESS", now, now);
    db.prepare("INSERT INTO session_activities (id,session_id,activity_type,sequence_number,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run("a1", "s1", "STORY", 0, "PLANNED", now, now);

    const provider = new FakeProvider({
      responses: {
        story: [{
          title: "Cooking Adventures",
          text: "The cook likes to simmer a soup slowly in the kitchen.",
          targetItems: ["simmer"],
          comprehensionQuestions: [{ question: "What does she like to do?", options: ["simmer soup", "run fast"], correctOptionIndex: 0 }],
        }],
      },
    });

    const activity: SessionActivity = { id: "a1", sessionId: "s1", activityType: "STORY", sequenceNumber: 0, status: "PLANNED", createdAt: now, updatedAt: now };

    const result = await generateStoryActivity(db, provider, "fake-model", {
      learnerId: "u",
      activity,
      language: "en",
      topic: "cooking",
      cefr: "A2",
      knownLemmas: ["the", "cook", "likes", "to", "a", "soup", "slowly", "in", "kitchen"],
      targetLexemes: [{ id: "lex_simmer", lemma: "simmer", role: "NEW" }],
      now: new Date(now),
    });

    expect(result.content.title).toBe("Cooking Adventures");
    expect(result.activity.contentId).toBe(result.content.id);

    const contentRow = db.prepare("SELECT * FROM content WHERE id=?").get(result.content.id) as Record<string, unknown>;
    expect(contentRow.status).toBe("VALID");

    const targetRows = db.prepare("SELECT * FROM content_target_items WHERE content_id=?").all(result.content.id) as Array<Record<string, unknown>>;
    expect(targetRows).toHaveLength(1);
    expect(targetRows[0]?.item_id).toBe("lex_simmer");

    const activityRow = db.prepare("SELECT * FROM session_activities WHERE id=?").get("a1") as Record<string, unknown>;
    expect(activityRow.content_id).toBe(result.content.id);
  });
});
