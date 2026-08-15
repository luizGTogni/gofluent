/**
 * NVIDIA_NIM.md §38-39 ASR Provider Contract, PRD §22 Speech-to-Text.
 * Domain/TUI code depends only on this interface, never on a specific ASR
 * vendor's wire format (mirrors `TextToSpeechProvider` in provider.ts).
 */
export interface AudioInput {
  /** Path to a short (typically <=60s) audio recording on disk. */
  filePath: string;
  language: string;
}

export interface TranscriptResult {
  text: string;
  confidence?: number;
}

export interface SpeechToTextProvider {
  readonly id: string;
  readonly displayName: string;

  isAvailable(signal?: AbortSignal): Promise<boolean>;

  transcribe(input: AudioInput, signal?: AbortSignal): Promise<TranscriptResult>;
}
