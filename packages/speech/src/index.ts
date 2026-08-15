/**
 * ASR/TTS provider boundaries (ARCHITECTURE.md §15). TTS/AudioPlayer landed
 * in Phase 3 (audio); ASR (NVIDIA Speech NIM REST adapter + fake) lands in
 * Phase 4 (Speak Mode).
 */
export * from "./provider/provider.js";
export * from "./provider/asr-provider.js";
export * from "./provider/errors.js";
export * from "./player/player.js";
export * from "./player/player-detection.js";
export * from "./player/system-audio-player.js";
export * from "./cache/text-hash.js";
export * from "./kokoro/process-runner.js";
export * from "./kokoro/kokoro-provider.js";
export * from "./fake/fake-tts-provider.js";
export * from "./fake/fake-asr-provider.js";
export * from "./edge/edge-tts-client.js";
export * from "./edge/edge-tts-provider.js";
export * from "./fallback/fallback-provider.js";
export * from "./nvidia/nvidia-asr-provider.js";
