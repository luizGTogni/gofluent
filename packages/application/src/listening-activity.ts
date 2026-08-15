import type { AudioAsset } from "@gofluent/core";
import { SqliteAudioAssetRepository, type DatabaseSync } from "@gofluent/db";
import { hashText, type TextToSpeechProvider } from "@gofluent/speech";
import { createId } from "@gofluent/shared";

/**
 * PRD §20/§21, ARCHITECTURE.md §49 Listening Architecture — synthesize once,
 * cache by text hash/voice/speed/provider, replay from cache afterwards.
 * Deterministic orchestration; the only generative edge is `tts.synthesize`.
 */
export interface SynthesizeCachedAudioInput {
  text: string;
  language: string;
  voice: string;
  speed: number;
  contentId?: string | undefined;
}

export async function synthesizeCachedAudio(
  db: DatabaseSync,
  tts: TextToSpeechProvider,
  input: SynthesizeCachedAudioInput,
  now: Date = new Date(),
): Promise<AudioAsset> {
  const repo = new SqliteAudioAssetRepository(db);
  const textHash = hashText(input.text);
  const cached = repo.findByCacheKey(textHash, input.voice, input.speed, tts.id);
  if (cached) return cached;

  const result = await tts.synthesize({ text: input.text, voice: input.voice, speed: input.speed, language: input.language });
  const asset: AudioAsset = {
    id: createId(),
    contentId: input.contentId,
    textHash,
    provider: tts.id,
    voice: result.voice,
    speed: result.speed,
    filePath: result.audioFilePath,
    durationMs: result.durationMs,
    createdAt: now.toISOString(),
  };
  repo.upsert(asset);
  return asset;
}

/** PRD §20 — "sentence-by-sentence" mode needs a deterministic, testable split. */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export const LISTENING_MODES = ["NORMAL", "SLOW", "SENTENCE_BY_SENTENCE"] as const;
export type ListeningMode = (typeof LISTENING_MODES)[number];

export const SLOW_SPEED_MULTIPLIER = 0.75;

export function speedForMode(mode: ListeningMode, baseSpeed: number): number {
  return mode === "SLOW" ? baseSpeed * SLOW_SPEED_MULTIPLIER : baseSpeed;
}
