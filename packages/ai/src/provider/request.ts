/** PROVIDER.md §26 — normalized roles; tool messages arrive only when a workflow needs them. */
export type Message =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

/** PROVIDER.md §20 */
export type ReasoningMode =
  | { type: "auto" }
  | { type: "off" }
  | { type: "on" }
  | { type: "effort"; level: string }
  | { type: "budget"; tokens: number };

export interface SamplingSettings {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
}

/**
 * PROVIDER.md §27 — structured output is still untrusted until `parse` validates it
 * (typically backed by a Zod schema; PRD §36).
 */
export interface OutputContract<T> {
  schemaName: string;
  parse(value: unknown): T;
}

/** PROVIDER.md §25 */
export interface GenerationRequest<T> {
  model: string;
  messages: Message[];
  reasoning?: ReasoningMode;
  sampling?: SamplingSettings;
  output: OutputContract<T>;
}

export interface StreamingGenerationRequest {
  model: string;
  messages: Message[];
  reasoning?: ReasoningMode;
  sampling?: SamplingSettings;
}
