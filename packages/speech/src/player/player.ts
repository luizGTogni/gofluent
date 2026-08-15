/**
 * ARCHITECTURE.md §50 Audio Playback Boundary — learning-engine/TUI code
 * must never know about OS-specific playback tools.
 */
export interface AudioFile {
  filePath: string;
}

export type PlaybackAvailability = { available: true } | { available: false; reason: string };

export interface AudioPlayer {
  isAvailable(): Promise<PlaybackAvailability>;
  play(file: AudioFile, signal?: AbortSignal): Promise<void>;
  stop(): Promise<void>;
}
