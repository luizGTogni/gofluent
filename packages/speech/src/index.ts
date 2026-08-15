/**
 * ASR/TTS provider boundaries (ARCHITECTURE.md §15). TTS/AudioPlayer land in
 * Phase 3 (audio); ASR stays an unimplemented stub until Phase 4 (Speak Mode).
 */
export * from "./provider/provider.js";
export * from "./provider/errors.js";
export * from "./player/player.js";
export * from "./player/player-detection.js";
export * from "./player/system-audio-player.js";
export * from "./cache/text-hash.js";
export * from "./kokoro/process-runner.js";
export * from "./kokoro/kokoro-provider.js";
export * from "./fake/fake-tts-provider.js";
export * from "./edge/edge-tts-client.js";
export * from "./edge/edge-tts-provider.js";
export * from "./fallback/fallback-provider.js";
