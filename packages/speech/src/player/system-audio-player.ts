import { spawn, type ChildProcess } from "node:child_process";
import type { AudioFile, AudioPlayer, PlaybackAvailability } from "./player.js";
import { SpeechError } from "../provider/errors.js";
import { detectPlayer, type CommandExistsChecker, type PlayerCandidate } from "./player-detection.js";
import { NodeProcessRunner } from "../kokoro/process-runner.js";

/**
 * ARCHITECTURE.md §50 — isolates OS playback behind `AudioPlayer` so no
 * learning-engine/TUI code depends on a specific CLI player. Degrades to
 * "playback unavailable" instead of crashing when nothing is found
 * (NVIDIA_NIM.md §43).
 */
export class SystemAudioPlayer implements AudioPlayer {
  private readonly commandExists: CommandExistsChecker;
  private readonly platform: NodeJS.Platform;
  private resolvedPlayer: PlayerCandidate | null | undefined;
  private current: ChildProcess | undefined;

  constructor(options: { commandExists?: CommandExistsChecker; platform?: NodeJS.Platform } = {}) {
    const runner = new NodeProcessRunner();
    this.commandExists = options.commandExists ?? ((command) => runner.commandExists(command));
    this.platform = options.platform ?? process.platform;
  }

  private async resolvePlayer(): Promise<PlayerCandidate | null> {
    if (this.resolvedPlayer === undefined) {
      this.resolvedPlayer = await detectPlayer(this.commandExists, this.platform);
    }
    return this.resolvedPlayer;
  }

  async isAvailable(): Promise<PlaybackAvailability> {
    const player = await this.resolvePlayer();
    return player ? { available: true } : { available: false, reason: "No supported audio player found on this system" };
  }

  async play(file: AudioFile, signal?: AbortSignal): Promise<void> {
    const player = await this.resolvePlayer();
    if (!player) {
      throw new SpeechError("UNAVAILABLE", "system-audio-player", "No supported audio player found on this system");
    }

    await new Promise<void>((resolve, reject) => {
      const child = spawn(player.command, player.buildArgs(file.filePath), { stdio: "ignore" });
      this.current = child;
      const onAbort = (): void => {
        child.kill();
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      child.once("error", (cause) => {
        signal?.removeEventListener("abort", onAbort);
        this.current = undefined;
        reject(new SpeechError("SYNTHESIS_FAILED", "system-audio-player", "Playback failed to start", { cause }));
      });
      child.once("close", (code) => {
        signal?.removeEventListener("abort", onAbort);
        this.current = undefined;
        if (signal?.aborted) {
          reject(new SpeechError("CANCELLED", "system-audio-player", "Playback was cancelled"));
          return;
        }
        if (code !== 0 && code !== null) {
          reject(new SpeechError("SYNTHESIS_FAILED", "system-audio-player", `Player exited with code ${code}`));
          return;
        }
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.current?.kill();
    this.current = undefined;
  }
}
