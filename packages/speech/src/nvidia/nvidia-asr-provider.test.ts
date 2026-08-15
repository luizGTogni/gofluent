import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NvidiaAsrProvider } from "./nvidia-asr-provider.js";
import { SpeechError } from "../provider/errors.js";

describe("NvidiaAsrProvider", () => {
  let audioFile: string;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gofluent-asr-"));
    audioFile = join(dir, "recording.wav");
    writeFileSync(audioFile, "fake-wav-bytes");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it("reports unavailable without a configured API key", async () => {
    const provider = new NvidiaAsrProvider({ baseUrl: "https://asr.example.test", apiKey: "" });
    await expect(provider.isAvailable()).resolves.toBe(false);
    await expect(provider.transcribe({ filePath: audioFile, language: "en" })).rejects.toMatchObject({
      code: "UNAVAILABLE",
    } satisfies Partial<SpeechError>);
  });

  it("transcribes via the REST endpoint when configured", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ text: "hello there", confidence: 0.87 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new NvidiaAsrProvider({ baseUrl: "https://asr.example.test", apiKey: "key123" });
    const result = await provider.transcribe({ filePath: audioFile, language: "en" });

    expect(result).toEqual({ text: "hello there", confidence: 0.87 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/v1/audio/transcriptions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key123");
  });

  it("normalizes a non-2xx response into TRANSCRIPTION_FAILED", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad request", { status: 400 })));
    const provider = new NvidiaAsrProvider({ baseUrl: "https://asr.example.test", apiKey: "key123" });

    await expect(provider.transcribe({ filePath: audioFile, language: "en" })).rejects.toMatchObject({
      code: "TRANSCRIPTION_FAILED",
    } satisfies Partial<SpeechError>);
  });

  it("normalizes a network failure into UNAVAILABLE", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const provider = new NvidiaAsrProvider({ baseUrl: "https://asr.example.test", apiKey: "key123" });

    await expect(provider.transcribe({ filePath: audioFile, language: "en" })).rejects.toMatchObject({
      code: "UNAVAILABLE",
    } satisfies Partial<SpeechError>);
  });
});
