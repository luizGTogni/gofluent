import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { readStoredConfig } from "@gofluent/config";
import { ModelSettingsScreen } from "./ModelSettingsScreen.js";
import { createInMemoryServices } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("ModelSettingsScreen", () => {
  let dir: string;
  let configFilePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gofluent-model-settings-test-"));
    configFilePath = join(dir, "config.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("edits the model, picks an effort level, and saves both", async () => {
    const services = { ...createInMemoryServices(), configFilePath };
    const { lastFrame, stdin, unmount } = render(<ModelSettingsScreen services={services} onDone={() => {}} />);

    await vi.waitFor(() => expect(lastFrame()).toContain("Model & Reasoning"), { timeout: 2000 });
    expect(lastFrame()).toContain("Model: fake-model"); // pre-filled with the current model

    for (let i = 0; i < "fake-model".length + 2; i += 1) { stdin.write("\x7f"); await tick(5); } // clear the pre-filled value
    for (const char of "deepseek-ai/deepseek-r1") { stdin.write(char); await tick(5); }
    stdin.write("\r");

    await vi.waitFor(() => expect(lastFrame()).toContain("Reasoning effort"), { timeout: 2000 });
    // Space (not a SelectList control key) absorbs the resubscription race without
    // corrupting the trimmed model text if a stale MODEL-phase closure catches it.
    stdin.write(" ");
    await tick(20);
    stdin.write("\x1B[B"); // down to "Low"
    await tick(20);
    stdin.write("\r");

    await vi.waitFor(() => expect(lastFrame()).toContain("Saved"), { timeout: 2000 });
    expect(readStoredConfig(configFilePath)).toEqual({
      ai: { model: "deepseek-ai/deepseek-r1", reasoningEffort: "low" },
    });

    unmount();
  });

  it("calls onDone without saving when Esc is pressed on the model step", async () => {
    const services = { ...createInMemoryServices(), configFilePath };
    const onDone = vi.fn();
    const { lastFrame, stdin, unmount } = render(<ModelSettingsScreen services={services} onDone={onDone} />);

    await vi.waitFor(() => expect(lastFrame()).toContain("Model & Reasoning"), { timeout: 2000 });
    stdin.write(" ");
    await tick(20);
    stdin.write("\x1B");
    await tick();

    expect(onDone).toHaveBeenCalled();
    expect(readStoredConfig(configFilePath)).toEqual({});
    unmount();
  });
});
