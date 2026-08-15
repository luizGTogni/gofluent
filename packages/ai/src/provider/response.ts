import type { ProviderId } from "./id.js";

/** PROVIDER.md §29 — keep fields optional; do not bake pricing assumptions in. */
export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}

/** PROVIDER.md §28 */
export interface GenerationResult<T> {
  value: T;
  usage?: Usage;
  requestId?: string;
  model: string;
  provider: ProviderId;
}
