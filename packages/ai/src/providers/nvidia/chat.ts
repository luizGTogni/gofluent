import type { Message, SamplingSettings } from "../../provider/request.js";
import type { Usage } from "../../provider/response.js";
import { ProviderError } from "../../provider/errors.js";

/** NVIDIA_NIM.md §10 — maps the generic request into NVIDIA's OpenAI-compatible payload. */
export function buildChatCompletionBody(
  model: string,
  messages: Message[],
  sampling: SamplingSettings | undefined,
): Record<string, unknown> {
  return {
    model,
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
    stream: false,
    ...(sampling?.temperature !== undefined ? { temperature: sampling.temperature } : {}),
    ...(sampling?.topP !== undefined ? { top_p: sampling.topP } : {}),
    ...(sampling?.maxOutputTokens !== undefined ? { max_tokens: sampling.maxOutputTokens } : {}),
  };
}

interface NvidiaChatCompletionResponse {
  id?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export interface ParsedChatCompletion {
  content: string;
  requestId?: string;
  usage: Usage;
}

export function parseChatCompletionResponse(raw: unknown, providerId: string): ParsedChatCompletion {
  const response = raw as NvidiaChatCompletionResponse;
  const content = response.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new ProviderError(
      "INVALID_RESPONSE",
      providerId,
      "NVIDIA NIM chat completion response is missing choices[0].message.content",
    );
  }

  return {
    content,
    ...(response.id !== undefined ? { requestId: response.id } : {}),
    usage: {
      ...(response.usage?.prompt_tokens !== undefined
        ? { inputTokens: response.usage.prompt_tokens }
        : {}),
      ...(response.usage?.completion_tokens !== undefined
        ? { outputTokens: response.usage.completion_tokens }
        : {}),
    },
  };
}
