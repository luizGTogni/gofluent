import { describe, expect, it } from "vitest";
import { mapHttpStatusToErrorCode } from "./errors.js";

describe("mapHttpStatusToErrorCode", () => {
  it.each([
    [401, "INVALID_CREDENTIAL"],
    [403, "INVALID_CREDENTIAL"],
    [404, "MODEL_NOT_FOUND"],
    [429, "RATE_LIMITED"],
    [500, "SERVER"],
    [503, "SERVER"],
    [400, "INVALID_REQUEST"],
  ] as const)("maps HTTP %i to %s", (status, expected) => {
    expect(mapHttpStatusToErrorCode(status)).toBe(expected);
  });
});
