import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KokoroTTSProvider } from "./kokoro-provider.js";
import type { ProcessRunner, ProcessRunResult } from "./process-runner.js";
import { SpeechError } from "../provider/errors.js";

class StubProcessRunner implements ProcessRunner {
  constructor(
    private readonly exists: boolean,
    private readonly result: ProcessRunResult | Error = { stdout: "", stderr: "", exitCode: 0 },
  ) {}
  async commandExists(): Promise<boolean> {
    return this.exists;
  }
  async run(): Promise<ProcessRunResult> {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

describe("KokoroTTSProvider", () => {
  let audioDir: string;

  beforeEach(() => {
    audioDir = mkdtempSync(join(tmpdir(), "gofluent-audio-"));
  });

  afterEach(() => {
    rmSync(audioDir, { recursive: true, force: true });
  });

  it("reports unavailable and fails synthesis with UNAVAILABLE when the CLI is not on PATH", async () => {
    const provider = new KokoroTTSProvider({
      defaultVoice: "af_heart",
      audioDir,
      runner: new StubProcessRunner(false),
    });

    await expect(provider.isAvailable()).resolves.toBe(false);
    await expect(provider.synthesize({ text: "hello", language: "en" })).rejects.toMatchObject({
      code: "UNAVAILABLE",
    } satisfies Partial<SpeechError>);
  });

  it("reports unavailable when KOKORO_MODEL_DIR does not exist, even if the CLI exists", async () => {
    const provider = new KokoroTTSProvider({
      defaultVoice: "af_heart",
      audioDir,
      modelDir: join(audioDir, "does-not-exist"),
      runner: new StubProcessRunner(true),
    });

    await expect(provider.isAvailable()).resolves.toBe(false);
  });

  it("synthesizes deterministically when the runtime is present and the subprocess succeeds", async () => {
    const provider = new KokoroTTSProvider({
      defaultVoice: "af_heart",
      audioDir,
      runner: new StubProcessRunner(true),
    });

    const result = await provider.synthesize({ text: "hello world", voice: "am_adam", speed: 1.2, language: "en" });

    expect(result.voice).toBe("am_adam");
    expect(result.speed).toBe(1.2);
    expect(result.audioFilePath).toContain(audioDir);

    const again = await provider.synthesize({ text: "hello world", voice: "am_adam", speed: 1.2, language: "en" });
    expect(again.audioFilePath).toBe(result.audioFilePath);
  });

  it("normalizes a failing subprocess into SYNTHESIS_FAILED", async () => {
    const provider = new KokoroTTSProvider({
      defaultVoice: "af_heart",
      audioDir,
      runner: new StubProcessRunner(true, new Error("exit code 1")),
    });

    await expect(provider.synthesize({ text: "hello", language: "en" })).rejects.toMatchObject({
      code: "SYNTHESIS_FAILED",
    });
  });

  it("lists known voice metadata without hardcoding provider objects in the domain", async () => {
    const provider = new KokoroTTSProvider({ defaultVoice: "af_heart", audioDir, runner: new StubProcessRunner(true) });
    const voices = await provider.listVoices();
    expect(voices.length).toBeGreaterThan(0);
    expect(voices[0]).toHaveProperty("id");
    expect(existsSync(audioDir)).toBe(true);
  });
});
