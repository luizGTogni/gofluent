import type { TextToSpeechProvider, TTSRequest, TTSResult, VoiceInfo } from "../provider/provider.js";
import { SpeechError } from "../provider/errors.js";

export interface FakeTextToSpeechProviderOptions {
  voices?: VoiceInfo[];
  available?: boolean;
  /** Deterministic synthetic duration, ms per character, so tests don't need real audio. */
  msPerChar?: number;
}

/**
 * Deterministic no-network `TextToSpeechProvider` (mirrors
 * packages/ai/src/providers/fake/fake-provider.ts) so `application`/TUI code
 * can be developed and tested without a real Kokoro runtime.
 */
export class FakeTextToSpeechProvider implements TextToSpeechProvider {
  readonly id = "fake";
  readonly displayName = "Fake TTS Provider (deterministic, for tests)";

  private readonly voices: VoiceInfo[];
  private readonly available: boolean;
  private readonly msPerChar: number;
  private synthesizeCallCount = 0;

  constructor(options: FakeTextToSpeechProviderOptions = {}) {
    this.voices = options.voices ?? [{ id: "fake-voice", language: "en", label: "Fake Voice" }];
    this.available = options.available ?? true;
    this.msPerChar = options.msPerChar ?? 60;
  }

  get callCount(): number {
    return this.synthesizeCallCount;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return this.voices;
  }

  async synthesize(input: TTSRequest): Promise<TTSResult> {
    this.synthesizeCallCount += 1;
    if (!this.available) {
      throw new SpeechError("UNAVAILABLE", this.id, "Fake TTS provider is configured as unavailable");
    }
    const voice = input.voice ?? this.voices[0]?.id ?? "fake-voice";
    const speed = input.speed ?? 1.0;
    return {
      audioFilePath: `fake://${voice}/${speed}/${input.text.length}`,
      durationMs: Math.round(input.text.length * this.msPerChar),
      voice,
      speed,
    };
  }
}
