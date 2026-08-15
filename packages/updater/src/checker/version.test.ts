import { describe, expect, it } from "vitest";
import { isNewerVersion, normalizeVersion, parseVersion } from "./version.js";

describe("parseVersion", () => {
  it("parses a plain SemVer string", () => {
    expect(parseVersion("0.2.0")).toEqual({ major: 0, minor: 2, patch: 0 });
  });

  it("strips a leading v", () => {
    expect(parseVersion("v0.2.0")).toEqual({ major: 0, minor: 2, patch: 0 });
  });

  it("captures a prerelease suffix", () => {
    expect(parseVersion("1.0.0-beta.1")).toEqual({ major: 1, minor: 0, patch: 0, prerelease: "beta.1" });
  });

  it("returns null for a non-SemVer string", () => {
    expect(parseVersion("latest")).toBeNull();
  });
});

describe("normalizeVersion", () => {
  it("normalizes v0.2.0 to 0.2.0", () => {
    expect(normalizeVersion("v0.2.0")).toBe("0.2.0");
  });
});

describe("isNewerVersion", () => {
  it("detects a newer patch/minor/major release", () => {
    expect(isNewerVersion("0.1.0", "0.2.0")).toBe(true);
    expect(isNewerVersion("0.1.0", "0.1.1")).toBe(true);
    expect(isNewerVersion("0.1.0", "1.0.0")).toBe(true);
  });

  it("reports no update for the same version", () => {
    expect(isNewerVersion("0.2.0", "0.2.0")).toBe(false);
  });

  it("never reports a downgrade as an update", () => {
    expect(isNewerVersion("0.3.0", "0.2.0")).toBe(false);
  });

  it("treats an unparseable version as no update", () => {
    expect(isNewerVersion("0.1.0", "not-a-version")).toBe(false);
  });
});
