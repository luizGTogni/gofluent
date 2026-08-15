/**
 * NVIDIA_NIM.md §44 — not every value is required; hosted vs self-hosted
 * deployments differ (e.g. self-hosted NIM may need no bearer token).
 */
export interface NvidiaConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs?: number;
}

export const DEFAULT_NVIDIA_TIMEOUT_MS = 30_000;
