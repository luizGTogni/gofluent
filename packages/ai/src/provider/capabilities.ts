/** PROVIDER.md §18 — provider structural guarantees never replace Zod/domain validation. */
export type StructuredOutputCapability = { type: "unsupported" } | { type: "json" } | { type: "json-schema" };

/** PROVIDER.md §19 — reasoning controls vary by model; do not assume one global enum. */
export type ReasoningCapability =
  | { type: "unsupported" }
  | { type: "toggle"; defaultEnabled?: boolean }
  | { type: "effort"; levels: string[]; defaultLevel?: string }
  | { type: "budget"; minTokens?: number; maxTokens?: number; defaultTokens?: number };

export interface ToolCapability {
  supported: boolean;
}

/** PROVIDER.md §21 — only send parameters a model actually supports. */
export interface SamplingCapability {
  temperature: boolean;
  topP: boolean;
  maxOutputTokens: boolean;
}

/** PROVIDER.md §17 — normalized model capability shape for language-learning workloads. */
export interface ModelCapabilities {
  streaming: boolean;
  structuredOutput: StructuredOutputCapability;
  reasoning: ReasoningCapability;
  tools: ToolCapability;
  vision: boolean;
  contextWindow?: number;
  sampling: SamplingCapability;
}

/** PROVIDER.md §24 — optional debugging metadata for capability resolution. */
export type CapabilitySource = "api" | "provider-metadata" | "built-in" | "cache";
