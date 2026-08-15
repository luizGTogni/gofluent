import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { readStoredConfig } from "@gofluent/config";
import { SetupScreen } from "./SetupScreen.js";
import { createInMemoryServices } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("SetupScreen", () => {
  let dir: string;
  let configFilePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gofluent-setup-test-"));
    configFilePath = join(dir, "config.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("skips straight to onDone when Esc is pressed on the intro", async () => {
    const services = { ...createInMemoryServices(), configFilePath };
    const onDone = vi.fn();
    const onSaved = vi.fn();
    const { lastFrame, stdin, unmount } = render(
      <SetupScreen services={services} onDone={onDone} onSaved={onSaved} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("GoFluent Setup"), { timeout: 2000 });
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    stdin.write("\x1B");
    await tick();

    expect(onDone).toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(readStoredConfig(configFilePath)).toEqual({});

    unmount();
  });

  it("walks key → model → effort, saving both and calling onSaved twice", async () => {
    const services = { ...createInMemoryServices(), configFilePath };
    const onDone = vi.fn();
    const onSaved = vi.fn();
    const { lastFrame, stdin, unmount } = render(
      <SetupScreen services={services} onDone={onDone} onSaved={onSaved} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("GoFluent Setup"), { timeout: 2000 });
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    stdin.write("\r"); // continue to the API key step
    await vi.waitFor(() => expect(lastFrame()).toContain("API Keys"), { timeout: 2000 });

    stdin.write(" "); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    for (const char of "sk-test") { stdin.write(char); await tick(5); }
    stdin.write("\r"); // save the key
    await vi.waitFor(() => expect(lastFrame()).toContain("Saved"), { timeout: 2000 });
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    stdin.write("\r"); // acknowledge -> moves to the model step

    await vi.waitFor(() => expect(lastFrame()).toContain("Model & Reasoning"), { timeout: 2000 });
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    stdin.write("\r"); // keep the pre-filled model, continue to effort
    await vi.waitFor(() => expect(lastFrame()).toContain("Reasoning effort"), { timeout: 2000 });
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    stdin.write("\r"); // pick "None" and save
    await vi.waitFor(() => expect(lastFrame()).toContain("Saved"), { timeout: 2000 });
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    stdin.write("\r"); // acknowledge -> calls onDone

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 2000 });
    expect(onSaved).toHaveBeenCalledTimes(2);

    const stored = readStoredConfig(configFilePath) as { ai?: { apiKey?: string } };
    expect(stored.ai?.apiKey).toContain("sk-test");

    unmount();
  });
});
