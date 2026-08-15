import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { MediaPrepScreen } from "./MediaPrepScreen.js";
import { createInMemoryServices } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function type(stdin: { write: (input: string) => void }, text: string): Promise<void> {
  stdin.write(" ");
  await tick(20);
  for (const char of text) {
    stdin.write(char);
    await tick(5);
  }
}

describe("MediaPrepScreen", () => {
  it("walks title -> transcript -> result -> drill -> done without any AI call", async () => {
    const services = createInMemoryServices();
    const { lastFrame, stdin, unmount } = render(
      <MediaPrepScreen services={services} onDone={() => {}} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Prepare Me"), { timeout: 2000 });
    await type(stdin, "The Office S1E1");
    stdin.write("\r");
    await vi.waitFor(() => expect(lastFrame()).toContain("Paste a permitted transcript"), { timeout: 2000 });

    await type(stdin, "The office is awkward. Apparently everyone shows up late.");
    stdin.write("\r");
    await type(stdin, "/done");
    stdin.write("\r");

    await vi.waitFor(() => expect(lastFrame()).toContain("Estimated comprehension"), { timeout: 2000 });
    expect(lastFrame()).toContain("The Office S1E1");
    await tick(20);

    stdin.write("\r"); // "Prepare me" is first in the sub-menu
    await vi.waitFor(() => expect(lastFrame()).toMatch(/item 1 of/), { timeout: 2000 });

    // Drill through every item, always choosing "Got it".
    let frame = lastFrame();
    while (frame && /item \d+ of \d+/.test(frame)) {
      stdin.write("\r");
      await tick(30);
      frame = lastFrame();
    }

    await vi.waitFor(() => expect(lastFrame()).toContain("You're ready for The Office S1E1"), { timeout: 2000 });

    const row = services.db.prepare("SELECT * FROM media_preparation").get() as Record<string, unknown>;
    expect(row.prepared_count).toBeGreaterThan(0);

    unmount();
  });
});
