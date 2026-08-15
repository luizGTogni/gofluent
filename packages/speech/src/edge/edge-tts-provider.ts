import { mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import type { TextToSpeechProvider, TTSRequest, TTSResult, VoiceInfo } from "../provider/provider.js";
import { SpeechError } from "../provider/errors.js";
import { hashText } from "../cache/text-hash.js";
import { speedToRate } from "./rate.js";
import { createEdgeTTSClient, type EdgeTTSClient } from "./edge-tts-client.js";

export interface EdgeTTSProviderOptions {
  defaultVoice: string;
  /** Directory audio files are written into (packages/config `audioDir`). */
  audioDir: string;
  clientFactory?: () => EdgeTTSClient;
}

/** A handful of well-known neural voices; the full catalog requires a network call `msedge-tts` also exposes if ever needed. */
const KNOWN_VOICES: VoiceInfo[] = [
  { id: "en-US-AriaNeural", language: "en", label: "Aria (US English, female)" },
  { id: "en-US-GuyNeural", language: "en", label: "Guy (US English, male)" },
  { id: "en-GB-SoniaNeural", language: "en", label: "Sonia (UK English, female)" },
];

/**
 * Online fallback TTS provider (NVIDIA_NIM.md §43 graceful degradation),
 * built on the Microsoft Edge "Read Aloud" service via `msedge-tts` — free,
 * no API key, but the learner's text leaves the device. Unlike Kokoro
 * (NVIDIA_NIM.md §40, on-device by design), this provider must stay opt-in:
 * bootstrap only constructs it when `speech.onlineFallbackEnabled` is true.
 */
export class EdgeTTSProvider implements TextToSpeechProvider {
  readonly id = "edge-tts";
  readonly displayName = "Microsoft Edge Read Aloud (online fallback)";

  private readonly defaultVoice: string;
  private readonly audioDir: string;
  private readonly clientFactory: () => EdgeTTSClient;

  constructor(options: EdgeTTSProviderOptions) {
    this.defaultVoice = options.defaultVoice;
    this.audioDir = options.audioDir;
    this.clientFactory = options.clientFactory ?? createEdgeTTSClient;
  }

  /** Reachability can only be proven by actually calling the service; `synthesize` is where real failures surface and degrade. */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return KNOWN_VOICES;
  }

  async synthesize(input: TTSRequest, signal?: AbortSignal): Promise<TTSResult> {
    const voice = input.voice ?? this.defaultVoice;
    const speed = input.speed ?? 1.0;
    mkdirSync(this.audioDir, { recursive: true });
    const cachedPath = join(this.audioDir, `${hashText(input.text)}-${voice}-${speed}-edge.mp3`);

    const tmpDir = mkdtempSync(join(tmpdir(), "gofluent-edge-tts-"));
    const client = this.clientFactory();
    try {
      if (signal?.aborted) throw new SpeechError("CANCELLED", this.id, "Edge TTS synthesis was cancelled");
      await client.setVoice(voice);
      const { audioFilePath } = await client.synthesizeToFile(tmpDir, input.text, speedToRate(speed));
      const finalPath = cachedPath.endsWith(extname(audioFilePath)) ? cachedPath : `${cachedPath}${extname(audioFilePath)}`;
      renameSync(audioFilePath, finalPath);
      return { audioFilePath: finalPath, voice, speed };
    } catch (cause) {
      if (cause instanceof SpeechError) throw cause;
      if (signal?.aborted) throw new SpeechError("CANCELLED", this.id, "Edge TTS synthesis was cancelled", { cause });
      throw new SpeechError("UNAVAILABLE", this.id, "Microsoft Edge Read Aloud service is unreachable", { cause });
    } finally {
      client.close();
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
