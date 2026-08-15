import { describe, expect, it } from "vitest";
import { createId } from "./id.js";

describe("createId", () => {
  it("generates unique UUIDs", () => {
    const a = createId();
    const b = createId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });
});
