import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { FakeProvider } from "@gofluent/ai";
import { SpeakScreen } from "./SpeakScreen.js";
import { createInMemoryServices } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ink's useInput resubscribes its listener each render, so rapid same-tick writes can hit a stale
 * closure (see App.test.tsx comment on SelectList); typing one character per tick avoids that. */
async function type(stdin: { write: (input: string) => void }, text: string): Promise<void> {
  // First character can land before the post-mic-availability re-render's useInput
  // listener resubscribes; a throwaway keystroke absorbs that race.
  stdin.write(" ");
  await tick(20);
  for (const char of text) {
    stdin.write(char);
    await tick(5);
  }
}

function queueTurn(services: ReturnType<typeof createInMemoryServices>): void {
  (services.provider as FakeProvider).enqueue("conversation_turn", {
    tutorReply: "Sure, what would you like to order?",
    feedback: { good: ["Nice greeting!"], corrections: [{ original: "I wants", corrected: "I want" }], newPhrase: "figure it out" },
    detectedErrors: [{ category: "GRAMMAR", original: "I wants", preferred: "I want", normalizedPattern: "want + s" }],
    usedLemmas: [],
  });
}

describe("SpeakScreen", () => {
  it("shows typed-only note when ASR is unavailable, and sends a typed message on Enter", async () => {
    const services = createInMemoryServices();
    queueTurn(services);

    const { lastFrame, stdin, unmount } = render(
      <SpeakScreen services={services} scenario="Ordering coffee" onDone={() => {}} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Typed conversation only"), { timeout: 2000 });

    await type(stdin, "I wants a coffee");
    expect(lastFrame()).toContain("I wants a coffee");

    stdin.write("\r");
    await vi.waitFor(() => expect(lastFrame()).toContain("what would you like to order"), { timeout: 2000 });

    expect(lastFrame()).toContain("Good: Nice greeting!");
    expect(lastFrame()).toContain('"I wants" → "I want"');
    expect(lastFrame()).toContain('New phrase: "figure it out"');

    unmount();
  });

  it("persists a detected error into learner_errors after a turn", async () => {
    const services = createInMemoryServices();
    queueTurn(services);

    const { stdin, lastFrame, unmount } = render(
      <SpeakScreen services={services} scenario="Ordering coffee" onDone={() => {}} onError={() => {}} />,
    );
    await vi.waitFor(() => expect(lastFrame()).toContain("Typed conversation only"), { timeout: 2000 });

    await type(stdin, "I wants a coffee");
    stdin.write("\r");
    await vi.waitFor(() => expect(lastFrame()).toContain("what would you like to order"), { timeout: 2000 });

    const row = services.db.prepare("SELECT * FROM learner_errors").get() as Record<string, unknown> | undefined;
    expect(row?.normalized_pattern).toBe("want + s");
    unmount();
  });

  it("calls onDone when the learner types /end", async () => {
    const services = createInMemoryServices();
    const onDone = vi.fn();

    const { stdin, lastFrame, unmount } = render(
      <SpeakScreen services={services} scenario="Ordering coffee" onDone={onDone} onError={() => {}} />,
    );
    await vi.waitFor(() => expect(lastFrame()).toContain("Typed conversation only"), { timeout: 2000 });

    await type(stdin, "/end");
    stdin.write("\r");
    await tick();

    expect(onDone).toHaveBeenCalled();
    unmount();
  });
});
