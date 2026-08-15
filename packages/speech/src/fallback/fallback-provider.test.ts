import { describe, expect, it } from "vitest";
import { FallbackTextToSpeechProvider } from "./fallback-provider.js";
import { FakeTextToSpeechProvider } from "../fake/fake-tts-provider.js";
import type { TTSResult } from "../provider/provider.js";

describe("FallbackTextToSpeechProvider", () => {
  it("uses the first available provider", async () => {
    const primary = new FakeTextToSpeechProvider({ available: true });
    const secondary = new FakeTextToSpeechProvider({ available: true });
    const fallback = new FallbackTextToSpeechProvider([primary, secondary]);

    const result = await fallback.synthesize({ text: "hello", language: "en" });

    expect(result.audioFilePath).toContain("fake-voice");
    expect(primary.callCount).toBe(1);
    expect(secondary.callCount).toBe(0);
  });

  it("falls through to the next provider when the primary is unavailable", async () => {
    const primary = new FakeTextToSpeechProvider({ available: false });
    const secondary = new FakeTextToSpeechProvider({ available: true });
    const fallback = new FallbackTextToSpeechProvider([primary, secondary]);

    await fallback.synthesize({ text: "hello", language: "en" });

    expect(secondary.callCount).toBe(1);
  });

  it("falls through when the primary reports available but synthesis still throws", async () => {
    class FlakyProvider extends FakeTextToSpeechProvider {
      override async synthesize(): Promise<TTSResult> {
        throw new Error("boom");
      }
    }
    const primary = new FlakyProvider({ available: true });
    const secondary = new FakeTextToSpeechProvider({ available: true });
    const fallback = new FallbackTextToSpeechProvider([primary, secondary]);

    const result = await fallback.synthesize({ text: "hello", language: "en" });
    expect(secondary.callCount).toBe(1);
    expect(result).toBeDefined();
  });

  it("throws SpeechError UNAVAILABLE when no provider is available", async () => {
    const fallback = new FallbackTextToSpeechProvider([
      new FakeTextToSpeechProvider({ available: false }),
      new FakeTextToSpeechProvider({ available: false }),
    ]);

    await expect(fallback.synthesize({ text: "hello", language: "en" })).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    await expect(fallback.isAvailable()).resolves.toBe(false);
  });
});
