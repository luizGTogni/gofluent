import type { LLMProvider } from "../../provider/provider.js";
import type { CredentialStatus } from "../../provider/credentials.js";
import type { Model } from "../../provider/model.js";
import type { GenerationRequest } from "../../provider/request.js";
import type { GenerationResult } from "../../provider/response.js";
import { ProviderError } from "../../provider/errors.js";
import type { NvidiaConfig } from "./config.js";
import { validateNvidiaCredentials } from "./auth.js";
import { listNvidiaModels } from "./models.js";
import { nvidiaRequest } from "./client.js";
import { buildChatCompletionBody, parseChatCompletionResponse } from "./chat.js";

export type { NvidiaConfig } from "./config.js";

/**
 * NVIDIA_NIM.md §3, §8 — uses `/v1/chat/completions` for the MVP. Structured
 * output is requested as plain JSON text and validated by
 * `request.output.parse` (typically Zod) — provider-side JSON mode is never
 * trusted on its own (NVIDIA_NIM.md §23, §25).
 */
export class NvidiaNimProvider implements LLMProvider {
  readonly id = "nvidia";
  readonly displayName = "NVIDIA NIM";

  constructor(private readonly config: NvidiaConfig) {}

  async validateCredentials(signal?: AbortSignal): Promise<CredentialStatus> {
    return validateNvidiaCredentials(this.config, signal);
  }

  async listModels(signal?: AbortSignal): Promise<Model[]> {
    return listNvidiaModels(this.config, signal);
  }

  async generate<T>(request: GenerationRequest<T>, signal?: AbortSignal): Promise<GenerationResult<T>> {
    if (!this.config.apiKey || this.config.apiKey.trim().length === 0) {
      throw new ProviderError("MISSING_CREDENTIAL", this.id, "NVIDIA_API_KEY is not configured");
    }

    const model = request.model || this.config.model;
    const body = buildChatCompletionBody(model, request.messages, request.sampling, this.config.reasoningEffort);

    const raw = await nvidiaRequest(
      this.config,
      "/v1/chat/completions",
      { method: "POST", body: JSON.stringify(body) },
      signal,
    );

    const { content, requestId, usage } = parseChatCompletionResponse(raw, this.id);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch (cause) {
      throw new ProviderError(
        "INVALID_RESPONSE",
        this.id,
        "NVIDIA NIM chat completion content was not valid JSON",
        { cause },
      );
    }

    const value = request.output.parse(parsedJson);

    return {
      value,
      model,
      provider: this.id,
      usage,
      ...(requestId !== undefined ? { requestId } : {}),
    };
  }
}
