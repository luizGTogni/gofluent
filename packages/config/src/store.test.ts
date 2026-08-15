import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readStoredConfig, saveStoredConfig } from "./store.js";
import { ConfigurationError } from "@gofluent/core";

describe("saveStoredConfig / readStoredConfig", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gofluent-config-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns {} when nothing has been saved yet", () => {
    expect(readStoredConfig(join(dir, "config.json"))).toEqual({});
  });

  it("creates the parent directory and persists a patch", () => {
    const path = join(dir, "nested", "config.json");
    saveStoredConfig(path, { ai: { apiKey: "secret" } });

    expect(readStoredConfig(path)).toEqual({ ai: { apiKey: "secret" } });
  });

  it("deep-merges successive saves instead of overwriting siblings", () => {
    const path = join(dir, "config.json");
    saveStoredConfig(path, { ai: { apiKey: "key-1", model: "model-a" } });
    saveStoredConfig(path, { ai: { apiKey: "key-2" } });

    expect(readStoredConfig(path)).toEqual({ ai: { apiKey: "key-2", model: "model-a" } });
  });

  it("writes the file with owner-only permissions", () => {
    if (process.platform === "win32") return;
    const path = join(dir, "config.json");
    saveStoredConfig(path, { ai: { apiKey: "secret" } });

    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("throws ConfigurationError on malformed JSON", () => {
    const path = join(dir, "config.json");
    writeFileSync(path, "{not json");
    expect(() => readStoredConfig(path)).toThrow(ConfigurationError);
  });
});
