import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { PLACEMENT_QUESTIONS } from "@gofluent/application";
import { PlacementScreen } from "./PlacementScreen.js";
import { createInMemoryServices, LOCAL_USER_ID } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pressDown(stdin: { write: (input: string) => void }, times: number): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    stdin.write("\x1B[B");
    await tick(10);
  }
}

describe("PlacementScreen", () => {
  it("lists an \"I don't know\" option after the answer choices", async () => {
    const services = createInMemoryServices();
    const { lastFrame, unmount } = render(
      <PlacementScreen services={services} onDone={() => {}} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Placement — question 1"), { timeout: 2000 });
    expect(lastFrame()).toContain("I don't know");

    unmount();
  });

  it("records a SKIPPED encounter (not a wrong answer) when \"I don't know\" is picked", async () => {
    const services = createInMemoryServices();
    const onDone = vi.fn();
    const { lastFrame, stdin, unmount } = render(
      <PlacementScreen services={services} onDone={onDone} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Placement — question 1"), { timeout: 2000 });

    // Question 1: pick "I don't know" (the row after every option).
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    await pressDown(stdin, PLACEMENT_QUESTIONS[0]!.options.length);
    stdin.write("\r");

    // Every remaining question: pick the correct option so the assessment finishes.
    for (let i = 1; i < PLACEMENT_QUESTIONS.length; i += 1) {
      const q = PLACEMENT_QUESTIONS[i]!;
      await vi.waitFor(() => expect(lastFrame()).toContain(`question ${i + 1}`), { timeout: 2000 });
      await pressDown(stdin, q.correctOptionIndex);
      stdin.write("\r");
      await tick(10);
    }

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 2000 });

    const encounter = services.db
      .prepare("SELECT result FROM encounters WHERE item_id=? AND learner_id=?")
      .get(PLACEMENT_QUESTIONS[0]!.lexemeId, LOCAL_USER_ID) as { result: string } | undefined;
    expect(encounter?.result).toBe("SKIPPED");

    unmount();
  });
});
