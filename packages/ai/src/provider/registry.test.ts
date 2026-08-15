import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "./registry.js";
import { FakeProvider } from "../providers/fake/fake-provider.js";

describe("ProviderRegistry", () => {
  it("registers and resolves providers by stable ID", () => {
    const registry = new ProviderRegistry();
    const fake = new FakeProvider();

    registry.register(fake);

    expect(registry.get("fake")).toBe(fake);
    expect(registry.get("nvidia")).toBeUndefined();
    expect(registry.list()).toEqual([fake]);
  });
});
