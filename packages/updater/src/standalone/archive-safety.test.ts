import { describe, expect, it } from "vitest";
import { isSafeArchiveEntryPath } from "./archive-safety.js";

describe("isSafeArchiveEntryPath", () => {
  it("accepts ordinary relative paths", () => {
    expect(isSafeArchiveEntryPath("gofluent/bin/gofluent")).toBe(true);
    expect(isSafeArchiveEntryPath("README.md")).toBe(true);
  });

  it("rejects the doc's own path-traversal example", () => {
    expect(isSafeArchiveEntryPath("../../malicious-file")).toBe(false);
  });

  it("rejects any segment equal to ..", () => {
    expect(isSafeArchiveEntryPath("gofluent/../../etc/passwd")).toBe(false);
  });

  it("rejects absolute POSIX paths", () => {
    expect(isSafeArchiveEntryPath("/etc/passwd")).toBe(false);
  });

  it("rejects absolute Windows paths", () => {
    expect(isSafeArchiveEntryPath("C:\\Windows\\System32\\evil.dll")).toBe(false);
  });

  it("rejects an empty path", () => {
    expect(isSafeArchiveEntryPath("")).toBe(false);
  });

  it("normalizes backslashes before checking traversal", () => {
    expect(isSafeArchiveEntryPath("..\\..\\malicious-file")).toBe(false);
  });
});
