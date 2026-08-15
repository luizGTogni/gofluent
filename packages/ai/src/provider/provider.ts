import type { ProviderId } from "./id.js";
import type { CredentialStatus } from "./credentials.js";
import type { Model } from "./model.js";
import type { GenerationRequest, StreamingGenerationRequest } from "./request.js";
import type { GenerationResult } from "./response.js";
import type { GenerationStreamEvent } from "./stream.js";

/**
 * PROVIDER.md §9 — the generic contract every AI provider (NVIDIA, fake, and
 * future providers) implements. Domain/learning-engine code depends only on
 * this interface, never on a specific vendor's SDK or wire format.
 */
export interface LLMProvider {
  readonly id: ProviderId;
  readonly displayName: string;

  validateCredentials(signal?: AbortSignal): Promise<CredentialStatus>;

  listModels(signal?: AbortSignal): Promise<Model[]>;

  generate<T>(request: GenerationRequest<T>, signal?: AbortSignal): Promise<GenerationResult<T>>;

  stream?(
    request: StreamingGenerationRequest,
    signal?: AbortSignal,
  ): AsyncIterable<GenerationStreamEvent>;
}
