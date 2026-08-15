import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

/**
 * Thin seam over `msedge-tts` so `EdgeTTSProvider` never touches the vendor
 * SDK directly (ARCHITECTURE.md §15) and tests can inject a fake client
 * instead of hitting the real Microsoft Edge read-aloud service.
 */
export interface EdgeTTSClient {
  setVoice(voiceName: string): Promise<void>;
  synthesizeToFile(dirPath: string, text: string, rate?: string): Promise<{ audioFilePath: string }>;
  close(): void;
}

export function createEdgeTTSClient(): EdgeTTSClient {
  const client = new MsEdgeTTS();
  let configuredVoice: string | undefined;

  return {
    async setVoice(voiceName: string): Promise<void> {
      if (configuredVoice === voiceName) return;
      await client.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      configuredVoice = voiceName;
    },
    async synthesizeToFile(dirPath, text, rate) {
      const { audioFilePath } = await client.toFile(dirPath, text, rate ? { rate } : undefined);
      return { audioFilePath };
    },
    close(): void {
      client.close();
    },
  };
}
