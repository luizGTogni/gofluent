import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { App } from "./App.js";

async function pressEnter(stdin: { write: (input: string) => void }): Promise<void> {
  stdin.write("\r");
  await new Promise((resolve) => setTimeout(resolve, 20));
}

/** createInMemoryServices() has no API key, so Splash routes into the Setup gate first — Esc skips it. */
async function skipSetup(stdin: { write: (input: string) => void }, lastFrame: () => string | undefined): Promise<void> {
  await vi.waitFor(() => expect(lastFrame()).toContain("GoFluent Setup"), { timeout: 2000 });
  stdin.write("\x1B");
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("App", () => {
  it("shows the Splash screen first, then advances to Setup automatically", async () => {
    const { lastFrame, unmount } = render(<App />);

    expect(lastFrame()).toContain("GoFluent");

    await vi.waitFor(() => {
      expect(lastFrame()).toContain("GoFluent Setup");
    }, { timeout: 2000 });

    unmount();
  });

  it("walks Setup → Onboarding → Placement → Home end to end", async () => {
    const { lastFrame, stdin, unmount } = render(<App />);

    await skipSetup(stdin, lastFrame);
    await vi.waitFor(() => expect(lastFrame()).toContain("Welcome to GoFluent"), { timeout: 2000 });
    await pressEnter(stdin); // native language -> daily minutes
    // Each step swaps in a freshly mounted SelectList, whose useInput listener
    // subscribes in an effect after the render commits; on slower CI runners a
    // fixed 20ms isn't always enough, so wait for the step's own text instead.
    await vi.waitFor(() => expect(lastFrame()).toContain("How many minutes a day"), { timeout: 2000 });
    await pressEnter(stdin); // daily minutes -> interests
    await vi.waitFor(() => expect(lastFrame()).toContain("Pick a few interests"), { timeout: 2000 });

    stdin.write(" "); // toggle first interest
    await vi.waitFor(() => expect(lastFrame()).toContain("[x] travel"), { timeout: 2000 });
    // Extra settle time: SelectList's useInput callback is a fresh closure every
    // render, so Ink resubscribes its input listener in an effect after the toggle
    // re-render commits. Sending Enter immediately can still hit the stale listener.
    await new Promise((resolve) => setTimeout(resolve, 50));
    await pressEnter(stdin); // confirm interests -> summary
    await pressEnter(stdin); // confirm summary -> completes onboarding

    await vi.waitFor(() => expect(lastFrame()).toContain("Placement"), { timeout: 2000 });

    for (let i = 0; i < 12; i += 1) {
      await pressEnter(stdin);
    }

    await vi.waitFor(() => expect(lastFrame()).toContain("Home"), { timeout: 2000 });

    unmount();
  });
});
