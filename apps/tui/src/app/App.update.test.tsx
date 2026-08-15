import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { FakeUpdateSource, UpdateChecker } from "@gofluent/updater";
import { App } from "./App.js";
import { createInMemoryServices } from "./bootstrap.js";

async function pressEnter(stdin: { write: (input: string) => void }): Promise<void> {
  stdin.write("\r");
  await new Promise((resolve) => setTimeout(resolve, 20));
}

/** Mirrors App.test.tsx's known-good Setup → Onboarding → Placement → Home walkthrough. */
async function walkToHome(stdin: { write: (input: string) => void }, lastFrame: () => string | undefined): Promise<void> {
  // createInMemoryServices() has no API key, so Splash routes into the Setup gate first — Esc skips it.
  await vi.waitFor(() => expect(lastFrame()).toContain("GoFluent Setup"), { timeout: 2000 });
  stdin.write("\x1B");
  await new Promise((resolve) => setTimeout(resolve, 20));

  await vi.waitFor(() => expect(lastFrame()).toContain("Welcome to GoFluent"), { timeout: 2000 });
  await pressEnter(stdin); // native language -> daily minutes
  await vi.waitFor(() => expect(lastFrame()).toContain("How many minutes a day"), { timeout: 2000 });
  await pressEnter(stdin); // daily minutes -> interests
  await vi.waitFor(() => expect(lastFrame()).toContain("Pick a few interests"), { timeout: 2000 });

  stdin.write(" "); // toggle first interest
  await vi.waitFor(() => expect(lastFrame()).toContain("[x] travel"), { timeout: 2000 });
  await new Promise((resolve) => setTimeout(resolve, 50));
  await pressEnter(stdin); // confirm interests -> summary
  await pressEnter(stdin); // confirm summary -> completes onboarding

  await vi.waitFor(() => expect(lastFrame()).toContain("Placement"), { timeout: 2000 });
  for (let i = 0; i < 12; i += 1) await pressEnter(stdin);

  await vi.waitFor(() => expect(lastFrame()).toContain("Home"), { timeout: 2000 });
}

describe("App update notification", () => {
  it("shows an update banner on Home when a newer stable release exists", async () => {
    const services = createInMemoryServices();
    const source = new FakeUpdateSource({ version: "0.2.0", tag: "v0.2.0", assets: [] });
    const withUpdate = { ...services, updateChecker: new UpdateChecker(source, "0.1.0") };

    const { lastFrame, stdin, unmount } = render(<App services={withUpdate} />);
    await walkToHome(stdin, lastFrame);

    await vi.waitFor(() => expect(lastFrame()).toContain("GoFluent 0.2.0 is available"), { timeout: 2000 });
    unmount();
  });

  it("never shows a banner when no updateChecker is configured", async () => {
    const services = createInMemoryServices(); // updateChecker: null by default
    const { lastFrame, stdin, unmount } = render(<App services={services} />);
    await walkToHome(stdin, lastFrame);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(lastFrame()).not.toContain("is available");
    unmount();
  });
});
