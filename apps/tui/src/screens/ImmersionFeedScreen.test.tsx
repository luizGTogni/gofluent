import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { ImmersionFeedScreen } from "./ImmersionFeedScreen.js";
import { createInMemoryServices } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("ImmersionFeedScreen", () => {
  it("lists 5 recommended items and drills into the first one (PODCAST)", async () => {
    const services = createInMemoryServices();
    const { lastFrame, stdin, unmount } = render(
      <ImmersionFeedScreen
        services={services}
        onOpenConversation={() => {}}
        onOpenBlindListening={() => {}}
        onOpenMediaPrep={() => {}}
        onBack={() => {}}
      />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Immersion Feed"), { timeout: 2000 });
    expect(lastFrame()).toContain("🎧");
    expect(lastFrame()).toContain("🎤");

    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick(20);
    stdin.write("\r"); // select first item (PODCAST)
    await vi.waitFor(() => expect(lastFrame()).toContain("PODCAST"), { timeout: 2000 });
    expect(lastFrame()).toContain("Start blind listening");

    unmount();
  });

  it("routes a CONVERSATION item to onOpenConversation with its topic", async () => {
    const services = createInMemoryServices();
    const onOpenConversation = vi.fn();
    const { lastFrame, stdin, unmount } = render(
      <ImmersionFeedScreen
        services={services}
        onOpenConversation={onOpenConversation}
        onOpenBlindListening={() => {}}
        onOpenMediaPrep={() => {}}
        onBack={() => {}}
      />,
    );
    await vi.waitFor(() => expect(lastFrame()).toContain("Immersion Feed"), { timeout: 2000 });

    stdin.write("j");
    await tick(20);
    for (let i = 0; i < 4; i += 1) { stdin.write("\x1B[B"); await tick(10); } // down arrow x4 -> 5th item (CONVERSATION)
    stdin.write("\r");
    await vi.waitFor(() => expect(lastFrame()).toContain("CONVERSATION"), { timeout: 2000 });
    await tick(20);

    stdin.write("\r"); // "Start conversation"
    await tick(20);
    expect(onOpenConversation).toHaveBeenCalledTimes(1);

    unmount();
  });
});
