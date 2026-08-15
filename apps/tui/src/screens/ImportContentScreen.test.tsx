import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { FakeProvider } from "@gofluent/ai";
import { ImportContentScreen } from "./ImportContentScreen.js";
import { createInMemoryServices } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ink's useInput resubscribes its listener each render, so a throwaway
 * keystroke first (see SpeakScreen.test.tsx) avoids a same-tick race. */
async function type(stdin: { write: (input: string) => void }, text: string): Promise<void> {
  stdin.write(" ");
  await tick(20);
  for (const char of text) {
    stdin.write(char);
    await tick(5);
  }
}

describe("ImportContentScreen", () => {
  it("accumulates typed lines and builds a lesson once /done is submitted", async () => {
    const services = createInMemoryServices();
    // Single-word source text keeps the mined-vocabulary candidate set to
    // exactly one lemma, so a single queued vocabulary note satisfies
    // generateImportedLesson's "every target lemma has a note" validation.
    (services.provider as FakeProvider).enqueue("imported_lesson", {
      comprehensionQuestions: [{ question: "What is a zorblax?", options: ["a made-up creature", "a car"], correctOptionIndex: 0 }],
      vocabularyNotes: [{ lemma: "zorblax", explanation: "A made-up creature used for testing." }],
    });

    const { lastFrame, stdin, unmount } = render(
      <ImportContentScreen services={services} onDone={() => {}} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Learn From Anything"), { timeout: 2000 });

    await type(stdin, "Zorblax.");
    expect(lastFrame()).toContain("Zorblax.");

    stdin.write("\r");
    await type(stdin, "/done");
    stdin.write("\r");

    await vi.waitFor(() => expect(lastFrame()).toContain("Lesson ready"), { timeout: 2000 });
    expect(lastFrame()).toContain("zorblax: A made-up creature used for testing.");
    expect(lastFrame()).toContain("What is a zorblax?");

    const row = services.db.prepare("SELECT * FROM imported_content").get() as Record<string, unknown> | undefined;
    expect(row?.raw_text).toContain("Zorblax.");

    unmount();
  });

  it("calls onDone when Esc is pressed before submitting", async () => {
    const services = createInMemoryServices();
    const onDone = vi.fn();

    const { lastFrame, stdin, unmount } = render(
      <ImportContentScreen services={services} onDone={onDone} onError={() => {}} />,
    );
    await vi.waitFor(() => expect(lastFrame()).toContain("Learn From Anything"), { timeout: 2000 });

    // Throwaway keystroke first absorbs the same-tick useInput resubscription race.
    stdin.write(" ");
    await tick(20);
    stdin.write("\x1B"); // Esc
    await tick();

    expect(onDone).toHaveBeenCalled();
    unmount();
  });
});
