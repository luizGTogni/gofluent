import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { AudioInput, SpeechToTextProvider, TranscriptResult } from "../provider/asr-provider.js";
import { SpeechError } from "../provider/errors.js";

export interface NvidiaAsrProviderOptions {
  /** NVIDIA_NIM.md §44 NVIDIA_ASR_BASE_URL. */
  baseUrl: string;
  apiKey?: string | undefined;
  model?: string | undefined;
  timeoutMs?: number;
}

interface NvidiaTranscriptionResponse {
  text?: string;
  confidence?: number;
}

/**
 * NVIDIA_NIM.md §38-39 — REST ASR adapter: short recording in, transcript
 * out. Uses the simplest interface (HTTP REST) the docs recommend for MVP
 * over gRPC/WebSocket streaming. Like the Kokoro/Edge TTS adapters, every
 * failure normalizes into `SpeechError` rather than throwing a raw
 * fetch/HTTP error, so the caller can degrade to typed input
 * (NVIDIA_NIM.md §43).
 */
export class NvidiaAsrProvider implements SpeechToTextProvider {
  readonly id = "nvidia-asr";
  readonly displayName = "NVIDIA Speech NIM (ASR)";

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly model: string | undefined;
  private readonly timeoutMs: number;

  constructor(options: NvidiaAsrProviderOptions) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  /** Reachability can only be proven by calling the service; configuration presence is the cheap pre-check. */
  async isAvailable(): Promise<boolean> {
    return this.baseUrl.trim().length > 0 && !!this.apiKey && this.apiKey.trim().length > 0;
  }

  async transcribe(input: AudioInput, signal?: AbortSignal): Promise<TranscriptResult> {
    if (!(await this.isAvailable())) {
      throw new SpeechError("UNAVAILABLE", this.id, "NVIDIA ASR is not configured (missing base URL or API key)");
    }

    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    let audio: Buffer;
    try {
      audio = await readFile(input.filePath);
    } catch (cause) {
      throw new SpeechError("INVALID_REQUEST", this.id, `Could not read audio file at ${input.filePath}`, { cause });
    }

    const form = new FormData();
    form.append("file", new Blob([audio]), basename(input.filePath));
    form.append("language", input.language);
    if (this.model) form.append("model", this.model);

    let response: Response;
    try {
      response = await fetch(new URL("/v1/audio/transcriptions", this.baseUrl), {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
        signal: combinedSignal,
      });
    } catch (cause) {
      if (signal?.aborted) throw new SpeechError("CANCELLED", this.id, "NVIDIA ASR request was cancelled", { cause });
      throw new SpeechError("UNAVAILABLE", this.id, "NVIDIA Speech NIM is unreachable", { cause });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SpeechError("TRANSCRIPTION_FAILED", this.id, `NVIDIA ASR request failed with status ${response.status}: ${body.slice(0, 500)}`);
    }

    let parsed: NvidiaTranscriptionResponse;
    try {
      parsed = (await response.json()) as NvidiaTranscriptionResponse;
    } catch (cause) {
      throw new SpeechError("TRANSCRIPTION_FAILED", this.id, "NVIDIA ASR returned a non-JSON body", { cause });
    }

    if (typeof parsed.text !== "string") {
      throw new SpeechError("TRANSCRIPTION_FAILED", this.id, "NVIDIA ASR response is missing `text`");
    }

    return { text: parsed.text, ...(typeof parsed.confidence === "number" ? { confidence: parsed.confidence } : {}) };
  }
}
