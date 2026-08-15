import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { TextToSpeechProvider, TTSRequest, TTSResult, VoiceInfo } from "../provider/provider.js";
import { SpeechError } from "../provider/errors.js";
import { hashText } from "../cache/text-hash.js";
import { NodeProcessRunner, type ProcessRunner } from "./process-runner.js";

export interface KokoroTTSProviderOptions {
  /** NVIDIA_NIM.md §44 KOKORO_MODEL_DIR — where downloaded model weights live. */
  modelDir?: string | undefined;
  /** NVIDIA_NIM.md §44 KOKORO_DEFAULT_VOICE. */
  defaultVoice: string;
  /** Directory audio files are written into (packages/config `audioDir`). */
  audioDir: string;
  /** CLI entrypoint expected to exist on PATH once the Kokoro runtime is installed. */
  command?: string;
  runner?: ProcessRunner;
}

const KNOWN_VOICES: VoiceInfo[] = [
  { id: "af_heart", language: "en", label: "Heart (US English, female)" },
  { id: "af_bella", language: "en", label: "Bella (US English, female)" },
  { id: "am_adam", language: "en", label: "Adam (US English, male)" },
  { id: "bf_emma", language: "en", label: "Emma (UK English, female)" },
];

/**
 * Best-effort local Kokoro-82M adapter (NVIDIA_NIM.md §40). Kokoro is a
 * local Python/ONNX inference model, not a pure-JS dependency, so this
 * adapter shells out to a CLI entrypoint (`command`, default "kokoro-tts")
 * expected to accept `--text --voice --speed --out`. When the model
 * directory or the CLI isn't present — the expected state in this sandboxed
 * dev environment — every call fails cleanly with `SpeechError("UNAVAILABLE")`
 * rather than throwing an unhandled error (NVIDIA_NIM.md §43).
 */
export class KokoroTTSProvider implements TextToSpeechProvider {
  readonly id = "kokoro";
  readonly displayName = "Kokoro (local TTS)";

  private readonly modelDir: string | undefined;
  private readonly defaultVoice: string;
  private readonly audioDir: string;
  private readonly command: string;
  private readonly runner: ProcessRunner;

  constructor(options: KokoroTTSProviderOptions) {
    this.modelDir = options.modelDir;
    this.defaultVoice = options.defaultVoice;
    this.audioDir = options.audioDir;
    this.command = options.command ?? "kokoro-tts";
    this.runner = options.runner ?? new NodeProcessRunner();
  }

  async isAvailable(): Promise<boolean> {
    if (this.modelDir && !existsSync(this.modelDir)) return false;
    return this.runner.commandExists(this.command);
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return KNOWN_VOICES;
  }

  async synthesize(input: TTSRequest, signal?: AbortSignal): Promise<TTSResult> {
    if (!(await this.isAvailable())) {
      throw new SpeechError(
        "UNAVAILABLE",
        this.id,
        "Kokoro runtime is not installed or KOKORO_MODEL_DIR does not exist",
      );
    }

    const voice = input.voice ?? this.defaultVoice;
    const speed = input.speed ?? 1.0;
    mkdirSync(this.audioDir, { recursive: true });
    const outputFile = join(this.audioDir, `${hashText(input.text)}-${voice}-${speed}.wav`);

    const args = [
      "--text", input.text,
      "--voice", voice,
      "--speed", String(speed),
      "--out", outputFile,
      ...(this.modelDir ? ["--model-dir", this.modelDir] : []),
    ];

    try {
      await this.runner.run(this.command, args, signal ? { signal } : {});
    } catch (cause) {
      if (signal?.aborted) {
        throw new SpeechError("CANCELLED", this.id, "Kokoro synthesis was cancelled", { cause });
      }
      throw new SpeechError("SYNTHESIS_FAILED", this.id, "Kokoro synthesis failed", { cause });
    }

    return { audioFilePath: outputFile, voice, speed };
  }
}
