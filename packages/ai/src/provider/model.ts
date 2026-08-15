import type { ModelCapabilities } from "./capabilities.js";
import type { ProviderId } from "./id.js";

/** PROVIDER.md §16 — do not fabricate metadata; unknown values stay unknown. */
export interface ModelMetadata {
  description?: string;
  contextWindow?: number;
  inputModalities?: Array<"text" | "image" | "audio">;
  outputModalities?: Array<"text" | "audio">;
}

/** PROVIDER.md §15 — preserve the provider's canonical model ID where practical. */
export interface Model {
  id: string;
  provider: ProviderId;
  displayName: string;
  capabilities: ModelCapabilities;
  metadata: ModelMetadata;
}
