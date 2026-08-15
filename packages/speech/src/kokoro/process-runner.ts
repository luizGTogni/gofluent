import { execFile } from "node:child_process";

/**
 * Subprocess boundary for the Kokoro adapter (NVIDIA_NIM.md §40 — Kokoro
 * runs locally via Python/ONNX inference, not an npm-installable JS lib).
 * Injectable so tests can simulate "runtime not present" deterministically
 * without shelling out or requiring a real Kokoro install.
 */
export interface ProcessRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ProcessRunner {
  commandExists(command: string): Promise<boolean>;
  run(command: string, args: string[], options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<ProcessRunResult>;
}

export class NodeProcessRunner implements ProcessRunner {
  async commandExists(command: string): Promise<boolean> {
    const probe = process.platform === "win32" ? "where" : "which";
    try {
      await this.run(probe, [command]);
      return true;
    } catch {
      return false;
    }
  }

  run(command: string, args: string[], options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<ProcessRunResult> {
    return new Promise((resolve, reject) => {
      execFile(
        command,
        args,
        { timeout: options?.timeoutMs ?? 30_000, signal: options?.signal },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          resolve({ stdout, stderr, exitCode: 0 });
        },
      );
    });
  }
}
