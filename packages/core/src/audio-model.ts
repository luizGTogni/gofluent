/**
 * Filesystem-backed TTS audio cache metadata (DATABASE.md §70 `audio_assets`,
 * §71-72 — cache, not user data; safely prunable without touching progress).
 */
export interface AudioAsset {
  id: string;
  contentId?: string | undefined;
  textHash: string;
  provider?: string | undefined;
  voice?: string | undefined;
  speed?: number | undefined;
  filePath: string;
  durationMs?: number | undefined;
  createdAt: string;
}

export interface AudioAssetRepository {
  get(id: string): AudioAsset | null;
  findByCacheKey(textHash: string, voice: string, speed: number, provider: string): AudioAsset | null;
  upsert(asset: AudioAsset): void;
}
