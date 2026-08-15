import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { WorldsScreen } from "./WorldsScreen.js";
import { createInMemoryServices } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("WorldsScreen", () => {
  it("lists seeded worlds with 0% mastery before any activity", async () => {
    const services = createInMemoryServices();
    const { lastFrame, unmount } = render(
      <WorldsScreen services={services} onStartBossChallenge={() => {}} onBack={() => {}} />,
    );
    await vi.waitFor(() => expect(lastFrame()).toContain("Worlds"), { timeout: 2000 });
    expect(lastFrame()).toContain("Everyday Life — 0% mastery");
    expect(lastFrame()).toContain("Travel — 0% mastery");
    expect(lastFrame()).toContain("Technology — 0% mastery");
    unmount();
  });

  it("drills into a world and offers to start its boss challenge", async () => {
    const services = createInMemoryServices();
    const onStart = vi.fn();
    const { lastFrame, stdin, unmount } = render(
      <WorldsScreen services={services} onStartBossChallenge={onStart} onBack={() => {}} />,
    );
    await vi.waitFor(() => expect(lastFrame()).toContain("Worlds"), { timeout: 2000 });
    // Throwaway keystroke first absorbs the same-tick useInput resubscription race (see SpeakScreen.test.tsx).
    stdin.write("j");
    await tick(20);

    stdin.write("\r"); // select first world (Everyday Life)
    await vi.waitFor(() => expect(lastFrame()).toContain("Coffee Shop Order"), { timeout: 2000 });
    expect(lastFrame()).toContain("Boss Challenge: Not completed");
    await tick(20);

    stdin.write("\r"); // "Start Boss Challenge" is first in the sub-menu
    await tick();
    expect(onStart).toHaveBeenCalledTimes(1);
    const [world, bossChallenge] = onStart.mock.calls[0] as [{ key: string }, { key: string }];
    expect(world.key).toBe("everyday-life");
    expect(bossChallenge.key).toBe("coffee-shop-order");

    unmount();
  });
});
