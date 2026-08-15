import type { Usage } from "./response.js";

/** PROVIDER.md §31 — provider-specific finish reasons must be normalized. */
export type FinishReason = "stop" | "length" | "cancelled" | "content-filter" | "tool-calls" | "other";

/** PROVIDER.md §30 */
export type GenerationStreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "usage"; usage: Usage }
  | { type: "finished"; reason: FinishReason };
