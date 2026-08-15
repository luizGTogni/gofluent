import type { AudioInput, SpeechToTextProvider, TranscriptResult } from "../provider/asr-provider.js";
import { SpeechError } from "../provider/errors.js";

export interface FakeSpeechToTextProviderOptions {
  available?: boolean;
  /** Deterministic canned transcripts returned in FIFO order; falls back to a fixed phrase once exhausted. */
  transcripts?: string[];
}

/**
 * Deterministic no-network `SpeechToTextProvider` (mirrors
 * `FakeTextToSpeechProvider`) so `application`/TUI code can be developed and
 * tested without a real NVIDIA ASR NIM deployment.
 */
export class FakeSpeechToTextProvider implements SpeechToTextProvider {
  readonly id = "fake";
  readonly displayName = "Fake ASR Provider (deterministic, for tests)";

  private readonly available: boolean;
  private readonly transcripts: string[];
  private transcribeCallCount = 0;

  constructor(options: FakeSpeechToTextProviderOptions = {}) {
    this.available = options.available ?? true;
    this.transcripts = options.transcripts ?? [];
  }

  get callCount(): number {
    return this.transcribeCallCount;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async transcribe(input: AudioInput): Promise<TranscriptResult> {
    this.transcribeCallCount += 1;
    if (!this.available) {
      throw new SpeechError("UNAVAILABLE", this.id, "Fake ASR provider is configured as unavailable");
    }
    const text = this.transcripts[this.transcribeCallCount - 1] ?? `[transcribed audio from ${input.filePath}]`;
    return { text, confidence: 0.9 };
  }
}
