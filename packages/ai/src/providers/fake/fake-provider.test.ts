import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FakeProvider } from "./fake-provider.js";
import { zodOutputContract } from "../../schemas/zod-output.js";
import { ProviderError } from "../../provider/errors.js";

const GreetingSchema = z.object({ greeting: z.string() });

describe("FakeProvider", () => {
  it("returns queued responses validated through the output contract", async () => {
    const provider = new FakeProvider({
      responses: { greeting: [{ greeting: "hello" }] },
    });

    const result = await provider.generate({
      model: "fake-model",
      messages: [{ role: "user", content: "hi" }],
      output: zodOutputContract("greeting", GreetingSchema, "fake"),
    });

    expect(result.value.greeting).toBe("hello");
    expect(result.provider).toBe("fake");
  });

  it("is deterministic — same queue order every call, FIFO", async () => {
    const provider = new FakeProvider({
      responses: { greeting: [{ greeting: "first" }, { greeting: "second" }] },
    });
    const output = zodOutputContract("greeting", GreetingSchema, "fake");

    const first = await provider.generate({ model: "m", messages: [], output });
    const second = await provider.generate({ model: "m", messages: [], output });

    expect(first.value.greeting).toBe("first");
    expect(second.value.greeting).toBe("second");
  });

  it("throws INVALID_RESPONSE when the queued response fails schema validation", async () => {
    const provider = new FakeProvider({ responses: { greeting: [{ wrong: true }] } });

    await expect(
      provider.generate({
        model: "m",
        messages: [],
        output: zodOutputContract("greeting", GreetingSchema, "fake"),
      }),
    ).rejects.toThrow(ProviderError);
  });

  it("throws when no response is queued for the requested schema", async () => {
    const provider = new FakeProvider();

    await expect(
      provider.generate({
        model: "m",
        messages: [],
        output: zodOutputContract("greeting", GreetingSchema, "fake"),
      }),
    ).rejects.toThrow(/No fake response queued/);
  });

  it("reports valid credentials by default", async () => {
    const provider = new FakeProvider();
    await expect(provider.validateCredentials()).resolves.toEqual({ status: "valid" });
  });

  it("honors a configured credential status", async () => {
    const provider = new FakeProvider({ credentialStatus: { status: "missing" } });
    await expect(provider.validateCredentials()).resolves.toEqual({ status: "missing" });
  });
});
