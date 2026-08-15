/**
 * NVIDIA_NIM.md §44 — not every value is required; hosted vs self-hosted
 * deployments differ (e.g. self-hosted NIM may need no bearer token).
 */
export interface NvidiaConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs?: number;
  /** NVIDIA_NIM.md §18 — sent as `reasoning_effort` on every request; undefined omits the field entirely. */
  reasoningEffort?: "low" | "medium" | "high";
}

export const DEFAULT_NVIDIA_TIMEOUT_MS = 30_000;
