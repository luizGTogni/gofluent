import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EdgeTTSProvider } from "./edge-tts-provider.js";
import type { EdgeTTSClient } from "./edge-tts-client.js";
import { SpeechError } from "../provider/errors.js";

class StubEdgeTTSClient implements EdgeTTSClient {
  closed = false;
  voice: string | undefined;
  constructor(private readonly behavior: "succeed" | "fail" = "succeed") {}
  async setVoice(voiceName: string): Promise<void> {
    this.voice = voiceName;
  }
  async synthesizeToFile(dirPath: string): Promise<{ audioFilePath: string }> {
    if (this.behavior === "fail") throw new Error("network unreachable");
    const audioFilePath = join(dirPath, "audio.mp3");
    writeFileSync(audioFilePath, "fake-mp3-bytes");
    return { audioFilePath };
  }
  close(): void {
    this.closed = true;
  }
}

describe("EdgeTTSProvider", () => {
  let audioDir: string;

  beforeEach(() => {
    audioDir = mkdtempSync(join(tmpdir(), "gofluent-edge-audio-"));
  });

  afterEach(() => {
    rmSync(audioDir, { recursive: true, force: true });
  });

  it("is always optimistically available (reachability can only be proven at synthesize time)", async () => {
    const provider = new EdgeTTSProvider({ defaultVoice: "en-US-AriaNeural", audioDir });
    await expect(provider.isAvailable()).resolves.toBe(true);
  });

  it("synthesizes into the shared audio cache directory and closes the client", async () => {
    const client = new StubEdgeTTSClient("succeed");
    const provider = new EdgeTTSProvider({
      defaultVoice: "en-US-AriaNeural",
      audioDir,
      clientFactory: () => client,
    });

    const result = await provider.synthesize({ text: "hello world", language: "en" });

    expect(result.voice).toBe("en-US-AriaNeural");
    expect(existsSync(result.audioFilePath)).toBe(true);
    expect(result.audioFilePath.startsWith(audioDir)).toBe(true);
    expect(client.closed).toBe(true);
  });

  it("normalizes a network/service failure into SpeechError UNAVAILABLE", async () => {
    const provider = new EdgeTTSProvider({
      defaultVoice: "en-US-AriaNeural",
      audioDir,
      clientFactory: () => new StubEdgeTTSClient("fail"),
    });

    await expect(provider.synthesize({ text: "hello", language: "en" })).rejects.toMatchObject({
      code: "UNAVAILABLE",
    } satisfies Partial<SpeechError>);
  });

  it("lists a curated set of known Edge voices without a network call", async () => {
    const provider = new EdgeTTSProvider({ defaultVoice: "en-US-AriaNeural", audioDir });
    const voices = await provider.listVoices();
    expect(voices.length).toBeGreaterThan(0);
    expect(voices[0]).toHaveProperty("id");
  });
});
