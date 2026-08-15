/**
 * NVIDIA_NIM.md §41 TTS Provider Contract, §42 Voice Discovery. Domain/TUI
 * code depends only on this interface, never on Kokoro-specific inference
 * objects (ARCHITECTURE.md §15, PRD §21).
 */
export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  language: string;
}

export interface TTSResult {
  audioFilePath: string;
  durationMs?: number;
  voice: string;
  speed: number;
}

export interface VoiceInfo {
  id: string;
  language: string;
  label: string;
}

export interface TextToSpeechProvider {
  readonly id: string;
  readonly displayName: string;

  isAvailable(signal?: AbortSignal): Promise<boolean>;

  listVoices(signal?: AbortSignal): Promise<VoiceInfo[]>;

  synthesize(input: TTSRequest, signal?: AbortSignal): Promise<TTSResult>;
}
