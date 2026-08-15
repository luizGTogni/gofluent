import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { readStoredConfig } from "@gofluent/config";
import { FakeProvider, type Model } from "@gofluent/ai";
import { ModelSettingsScreen } from "./ModelSettingsScreen.js";
import { createInMemoryServices } from "../app/bootstrap.js";

function fakeModel(id: string): Model {
  return {
    id,
    provider: "fake",
    displayName: id,
    capabilities: {
      streaming: false,
      structuredOutput: { type: "json" },
      reasoning: { type: "unsupported" },
      tools: { supported: false },
      vision: false,
      sampling: { temperature: true, topP: true, maxOutputTokens: true },
    },
    metadata: {},
  };
}

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

  it("falls back to free-text entry when the provider has no listed models, edits it, picks an effort level, and saves both", async () => {
    const services = { ...createInMemoryServices(), configFilePath };
    const { lastFrame, stdin, unmount } = render(<ModelSettingsScreen services={services} onDone={() => {}} />);

    await vi.waitFor(() => expect(lastFrame()).toContain("NVIDIA NIM model id"), { timeout: 2000 });
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

    await vi.waitFor(() => expect(lastFrame()).toContain("NVIDIA NIM model id"), { timeout: 2000 });
    stdin.write(" ");
    await tick(20);
    stdin.write("\x1B");
    await tick();

    expect(onDone).toHaveBeenCalled();
    expect(readStoredConfig(configFilePath)).toEqual({});
    unmount();
  });

  it("lists models fetched from the provider and lets the learner pick one", async () => {
    const services = {
      ...createInMemoryServices(),
      configFilePath,
      provider: new FakeProvider({ models: [fakeModel("model-a"), fakeModel("model-b")] }),
    };
    const { lastFrame, stdin, unmount } = render(<ModelSettingsScreen services={services} onDone={() => {}} />);

    await vi.waitFor(() => expect(lastFrame()).toContain("Models available"), { timeout: 2000 });
    expect(lastFrame()).toContain("model-a");
    expect(lastFrame()).toContain("model-b");

    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    stdin.write("\x1B[B"); // down to "model-b"
    await tick(20);
    stdin.write("\r");

    await vi.waitFor(() => expect(lastFrame()).toContain("Reasoning effort"), { timeout: 2000 });
    expect(lastFrame()).toContain("Model: model-b");

    unmount();
  });

  it("falls back to free-text entry when the learner picks \"Type a different model id\"", async () => {
    const services = {
      ...createInMemoryServices(),
      configFilePath,
      provider: new FakeProvider({ models: [fakeModel("model-a")] }),
    };
    const { lastFrame, stdin, unmount } = render(<ModelSettingsScreen services={services} onDone={() => {}} />);

    await vi.waitFor(() => expect(lastFrame()).toContain("Models available"), { timeout: 2000 });
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick();
    stdin.write("\x1B[B"); // down to "Type a different model id…"
    await tick(20);
    stdin.write("\r");

    await vi.waitFor(() => expect(lastFrame()).toContain("NVIDIA NIM model id"), { timeout: 2000 });

    unmount();
  });
});
