import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { FakeProvider } from "@gofluent/ai";
import { BlindListeningScreen } from "./BlindListeningScreen.js";
import { createInMemoryServices, LOCAL_USER_ID } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("BlindListeningScreen", () => {
  it("skips straight to comprehension (no transcript) when speech is unavailable, then reveals the transcript only in DEBRIEF", async () => {
    const services = createInMemoryServices();
    const now = "2026-01-01T00:00:00.000Z";
    const words = ["she", "loves", "to", "travel", "every", "summer"];
    for (const [index, word] of words.entries()) {
      const id = `lex_${index}_${word}`;
      services.db.prepare("INSERT INTO lexemes (id,language,lemma,created_at,updated_at) VALUES (?,?,?,?,?)").run(id, "en", word, now, now);
      services.db.prepare("INSERT INTO lexeme_forms (id,lexeme_id,form,normalized_form) VALUES (?,?,?,?)").run(`${id}:form`, id, word, word);
      services.db.prepare(
        "INSERT INTO learner_lexeme_state (learner_id,lexeme_id,encounters,heard_count,reading_recognition,listening_recognition,recall_score,productive_score,created_at,updated_at) VALUES (?,?,0,0,0,0,0,0,?,?)",
      ).run(LOCAL_USER_ID, id, now, now);
    }

    (services.provider as FakeProvider).enqueue("story", {
      title: "A Trip Abroad", text: "She loves to travel every summer.",
      targetItems: ["travel"], comprehensionQuestions: [{ question: "What does she love?", options: ["travel", "cook"], correctOptionIndex: 0 }],
    });

    const { lastFrame, stdin, unmount } = render(
      <BlindListeningScreen services={services} topic="travel" onDone={() => {}} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("What does she love?"), { timeout: 2000 });
    expect(lastFrame()).not.toContain("She loves to travel every summer");
    await tick(20);

    stdin.write("\r"); // answer/continue past the comprehension question
    await vi.waitFor(() => expect(lastFrame()).toContain("She loves to travel every summer"), { timeout: 2000 });
    expect(lastFrame()).toContain("Transcript");

    await tick(20); // let the debrief encounter-registration effect settle
    const encounterCount = (services.db.prepare("SELECT COUNT(*) AS count FROM encounters WHERE activity='LISTENING'").get() as { count: number }).count;
    expect(encounterCount).toBeGreaterThan(0);

    unmount();
  });
});
