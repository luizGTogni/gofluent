import { describe, expect, it } from "vitest";
import { buildChatCompletionBody, parseChatCompletionResponse } from "./chat.js";
import { ProviderError } from "../../provider/errors.js";

describe("buildChatCompletionBody", () => {
  it("maps normalized messages and sampling into the NVIDIA payload", () => {
    const body = buildChatCompletionBody(
      "some-model",
      [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
      ],
      { temperature: 0.2, topP: 0.9, maxOutputTokens: 500 },
    );

    expect(body).toEqual({
      model: "some-model",
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
      ],
      stream: false,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 500,
    });
  });

  it("omits sampling fields that were not provided", () => {
    const body = buildChatCompletionBody("m", [], undefined);
    expect(body).toEqual({ model: "m", messages: [], stream: false });
  });

  it("includes reasoning_effort when set, omits it otherwise", () => {
    const withEffort = buildChatCompletionBody("m", [], undefined, "high");
    expect(withEffort).toEqual({ model: "m", messages: [], stream: false, reasoning_effort: "high" });

    const withoutEffort = buildChatCompletionBody("m", [], undefined);
    expect(withoutEffort).not.toHaveProperty("reasoning_effort");
  });
});

describe("parseChatCompletionResponse", () => {
  it("extracts content, requestId, and usage", () => {
    const parsed = parseChatCompletionResponse(
      {
        id: "req-123",
        choices: [{ message: { content: "{\"ok\":true}" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      },
      "nvidia",
    );

    expect(parsed.content).toBe('{"ok":true}');
    expect(parsed.requestId).toBe("req-123");
    expect(parsed.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it("throws INVALID_RESPONSE when content is missing", () => {
    expect(() => parseChatCompletionResponse({ choices: [] }, "nvidia")).toThrow(ProviderError);
  });
});
