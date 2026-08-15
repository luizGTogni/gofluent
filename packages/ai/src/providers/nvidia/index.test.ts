import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { NvidiaNimProvider } from "./index.js";
import { zodOutputContract } from "../../schemas/zod-output.js";

const StorySchema = z.object({ title: z.string() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NvidiaNimProvider", () => {
  it("reports missing credentials without making a network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = new NvidiaNimProvider({ baseUrl: "https://example.test", model: "m" });
    const status = await provider.validateCredentials();

    expect(status).toEqual({ status: "missing" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to generate without a configured API key", async () => {
    const provider = new NvidiaNimProvider({ baseUrl: "https://example.test", model: "m" });

    await expect(
      provider.generate({
        model: "m",
        messages: [],
        output: zodOutputContract("story", StorySchema, "nvidia"),
      }),
    ).rejects.toMatchObject({ code: "MISSING_CREDENTIAL" });
  });

  it("maps a chat completion response through schema validation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "req-1",
        choices: [{ message: { content: JSON.stringify({ title: "A Story" }) } }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new NvidiaNimProvider({
      baseUrl: "https://example.test",
      apiKey: "secret",
      model: "m",
    });

    const result = await provider.generate({
      model: "m",
      messages: [{ role: "user", content: "write a story" }],
      output: zodOutputContract("story", StorySchema, "nvidia"),
    });

    expect(result.value).toEqual({ title: "A Story" });
    expect(result.requestId).toBe("req-1");

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
  });

  it("normalizes a 401 into INVALID_CREDENTIAL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "nope" }, 401)));

    const provider = new NvidiaNimProvider({
      baseUrl: "https://example.test",
      apiKey: "bad-key",
      model: "m",
    });

    await expect(
      provider.generate({
        model: "m",
        messages: [],
        output: zodOutputContract("story", StorySchema, "nvidia"),
      }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIAL" });
  });
});
