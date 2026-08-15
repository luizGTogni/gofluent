import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { readStoredConfig } from "@gofluent/config";
import { ApiKeysScreen } from "./ApiKeysScreen.js";
import { createInMemoryServices } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ink's useInput resubscribes its listener each render, so a throwaway
 * keystroke first (see SpeakScreen.test.tsx) avoids a same-tick race. */
async function type(stdin: { write: (input: string) => void }, text: string): Promise<void> {
  stdin.write(" ");
  await tick(20);
  for (const char of text) {
    stdin.write(char);
    await tick(5);
  }
}

describe("ApiKeysScreen", () => {
  let dir: string;
  let configFilePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gofluent-apikeys-test-"));
    configFilePath = join(dir, "config.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("types a key, saves it to disk, and shows confirmation", async () => {
    const services = { ...createInMemoryServices(), configFilePath };
    const { lastFrame, stdin, unmount } = render(<ApiKeysScreen services={services} onDone={() => {}} />);

    await vi.waitFor(() => expect(lastFrame()).toContain("API Keys"), { timeout: 2000 });
    expect(lastFrame()).toContain("(not set)");

    await type(stdin, "sk-test-1234");
    stdin.write("\r");

    await vi.waitFor(() => expect(lastFrame()).toContain("Saved"), { timeout: 2000 });
    expect(readStoredConfig(configFilePath)).toEqual({ ai: { apiKey: "sk-test-1234" }, asr: { apiKey: "sk-test-1234" } });

    unmount();
  });

  it("calls onDone without saving when Esc is pressed", async () => {
    const services = { ...createInMemoryServices(), configFilePath };
    const onDone = vi.fn();
    const { lastFrame, stdin, unmount } = render(<ApiKeysScreen services={services} onDone={onDone} />);

    await vi.waitFor(() => expect(lastFrame()).toContain("API Keys"), { timeout: 2000 });
    await type(stdin, "some-key");
    stdin.write("\x1B");
    await tick();

    expect(onDone).toHaveBeenCalled();
    expect(readStoredConfig(configFilePath)).toEqual({});

    unmount();
  });
});
