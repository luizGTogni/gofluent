import type { TextToSpeechProvider, TTSRequest, TTSResult, VoiceInfo } from "../provider/provider.js";
import { SpeechError } from "../provider/errors.js";

/**
 * Tries each provider in order (e.g. local Kokoro first, then an opt-in
 * online fallback) and falls through on failure, so a down/unavailable
 * primary never blocks listening (NVIDIA_NIM.md §43). `isAvailable` is
 * advisory only — a provider that reports available can still fail at
 * `synthesize` time (true for the online fallback, whose reachability can
 * only be proven by calling it), so `synthesize` retries the next provider
 * on any `SpeechError` rather than trusting `isAvailable` alone.
 */
export class FallbackTextToSpeechProvider implements TextToSpeechProvider {
  readonly id = "fallback";
  readonly displayName = "Fallback TTS";

  constructor(private readonly providers: TextToSpeechProvider[]) {}

  async isAvailable(signal?: AbortSignal): Promise<boolean> {
    for (const provider of this.providers) {
      if (await provider.isAvailable(signal)) return true;
    }
    return false;
  }

  async listVoices(signal?: AbortSignal): Promise<VoiceInfo[]> {
    for (const provider of this.providers) {
      if (await provider.isAvailable(signal)) return provider.listVoices(signal);
    }
    return [];
  }

  async synthesize(input: TTSRequest, signal?: AbortSignal): Promise<TTSResult> {
    let lastError: unknown;
    for (const provider of this.providers) {
      if (!(await provider.isAvailable(signal))) continue;
      try {
        return await provider.synthesize(input, signal);
      } catch (cause) {
        lastError = cause;
      }
    }
    if (lastError instanceof SpeechError) throw lastError;
    throw new SpeechError("UNAVAILABLE", this.id, "No TTS provider was able to synthesize this text", {
      cause: lastError,
    });
  }
}
