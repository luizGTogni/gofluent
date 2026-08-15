import { SpeechProviderError } from "@gofluent/core";

/** NVIDIA_NIM.md §41/§45 — stable categories TTS adapters normalize into (mirrors packages/ai's ProviderErrorCode). */
export type SpeechErrorCode =
  | "MISSING_MODEL"
  | "UNAVAILABLE"
  | "TIMEOUT"
  | "SYNTHESIS_FAILED"
  | "INVALID_REQUEST"
  | "CANCELLED";

/**
 * Normalized TTS/playback failure. The TUI reads `code`, never raw
 * subprocess exit codes or driver-specific error shapes (NVIDIA_NIM.md §43 —
 * speech failure must not block text learning).
 */
export class SpeechError extends SpeechProviderError {
  readonly code: SpeechErrorCode;
  readonly provider: string;

  constructor(code: SpeechErrorCode, provider: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
    this.provider = provider;
  }
}
