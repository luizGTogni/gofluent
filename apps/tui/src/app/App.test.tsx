import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { App } from "./App.js";

async function pressEnter(stdin: { write: (input: string) => void }): Promise<void> {
  stdin.write("\r");
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("App", () => {
  it("shows the Splash screen first, then advances to Onboarding automatically", async () => {
    vi.useFakeTimers();
    const { lastFrame, unmount } = render(<App />);

    expect(lastFrame()).toContain("GoFluent");

    vi.advanceTimersByTime(1000);
    await vi.waitFor(() => {
      expect(lastFrame()).toContain("Welcome to GoFluent");
    });

    unmount();
    vi.useRealTimers();
  });

  it("walks Onboarding → Placement → Home end to end", async () => {
    const { lastFrame, stdin, unmount } = render(<App />);

    await vi.waitFor(() => expect(lastFrame()).toContain("Welcome to GoFluent"), { timeout: 2000 });
    await pressEnter(stdin); // native language -> daily minutes
    await pressEnter(stdin); // daily minutes -> interests

    stdin.write(" "); // toggle first interest
    await new Promise((resolve) => setTimeout(resolve, 20));
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
