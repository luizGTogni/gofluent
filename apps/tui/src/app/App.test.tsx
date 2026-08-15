import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { App } from "./App.js";

describe("App", () => {
  it("shows the Splash screen first, then advances to Onboarding automatically", async () => {
    vi.useFakeTimers();
    const { lastFrame, unmount } = render(<App />);

    expect(lastFrame()).toContain("GoFluent");

    vi.advanceTimersByTime(1000);
    await vi.waitFor(() => {
      expect(lastFrame()).toContain("Onboarding");
    });

    unmount();
    vi.useRealTimers();
  });

  it("advances Onboarding → Placement → Home on Enter", async () => {
    const { lastFrame, stdin, unmount } = render(<App />);

    // Skip splash by advancing real time isn't needed here; drive via input once on Onboarding.
    await vi.waitFor(() => expect(lastFrame()).toContain("Onboarding"), { timeout: 2000 });

    stdin.write("\r");
    await vi.waitFor(() => expect(lastFrame()).toContain("Placement"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    stdin.write("\r");
    await vi.waitFor(() => expect(lastFrame()).toContain("Home"), { timeout: 2000 });

    unmount();
  });
});
