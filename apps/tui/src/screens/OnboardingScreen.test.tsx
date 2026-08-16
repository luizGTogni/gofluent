import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { OnboardingScreen } from "./OnboardingScreen.js";
import { createInMemoryServices, LOCAL_USER_ID } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pressEnter(stdin: { write: (input: string) => void }): Promise<void> {
  stdin.write("\r");
  await tick();
}

describe("OnboardingScreen", () => {
  it("merges typed custom interests with the picked list, deduping and trimming", async () => {
    const services = createInMemoryServices();
    const { lastFrame, stdin, unmount } = render(
      <OnboardingScreen services={services} onDone={() => {}} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Welcome to GoFluent"), { timeout: 2000 });
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    await pressEnter(stdin); // native language -> daily minutes
    await vi.waitFor(() => expect(lastFrame()).toContain("How many minutes a day"), { timeout: 2000 });
    await pressEnter(stdin); // daily minutes -> interests
    await vi.waitFor(() => expect(lastFrame()).toContain("Pick a few interests"), { timeout: 2000 });

    stdin.write(" "); // toggle "travel"
    await vi.waitFor(() => expect(lastFrame()).toContain("[x] travel"), { timeout: 2000 });
    await tick(50);
    await pressEnter(stdin); // confirm interests -> custom interests

    await vi.waitFor(() => expect(lastFrame()).toContain("Any other interests"), { timeout: 2000 });
    for (const char of "  bird watching , travel, chess ") { stdin.write(char); await tick(5); }
    stdin.write("\r"); // confirm custom interests -> summary

    await vi.waitFor(() => expect(lastFrame()).toContain("Interests:"), { timeout: 2000 });
    expect(lastFrame()).toContain("travel, bird watching, chess");
    await tick(50); // let the freshly mounted SUMMARY SelectList's useInput subscribe (see App.test.tsx)

    await pressEnter(stdin); // confirm summary -> completes onboarding

    await vi.waitFor(() => {
      const rows = services.db.prepare("SELECT interest FROM learner_interests WHERE user_id=? ORDER BY weight DESC").all(LOCAL_USER_ID) as Array<{ interest: string }>;
      expect(rows.map((r) => r.interest)).toEqual(["travel", "bird watching", "chess"]);
    }, { timeout: 2000 });

    unmount();
  });

  it("leaves interests unchanged when the custom field is left blank", async () => {
    const services = createInMemoryServices();
    const onDone = vi.fn();
    const { lastFrame, stdin, unmount } = render(
      <OnboardingScreen services={services} onDone={onDone} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Welcome to GoFluent"), { timeout: 2000 });
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    await pressEnter(stdin);
    await vi.waitFor(() => expect(lastFrame()).toContain("How many minutes a day"), { timeout: 2000 });
    await pressEnter(stdin);
    await vi.waitFor(() => expect(lastFrame()).toContain("Pick a few interests"), { timeout: 2000 });

    stdin.write(" ");
    await vi.waitFor(() => expect(lastFrame()).toContain("[x] travel"), { timeout: 2000 });
    await tick(50);
    await pressEnter(stdin);

    await vi.waitFor(() => expect(lastFrame()).toContain("Any other interests"), { timeout: 2000 });
    await pressEnter(stdin); // leave blank -> summary

    await vi.waitFor(() => expect(lastFrame()).toContain("Interests: travel"), { timeout: 2000 });
    expect(lastFrame()).not.toContain("Interests: travel,");

    unmount();
  });
});
