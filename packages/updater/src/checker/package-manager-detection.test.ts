import { describe, expect, it } from "vitest";
import { detectPackageManager, suggestedUpdateCommand } from "./package-manager-detection.js";

describe("detectPackageManager", () => {
  it("detects pnpm via npm_config_user_agent", () => {
    expect(detectPackageManager({ npm_config_user_agent: "pnpm/8.6.0 npm/? node/v24" })).toBe("pnpm");
  });

  it("detects npm via npm_execpath as a fallback", () => {
    expect(detectPackageManager({ npm_execpath: "/usr/local/lib/node_modules/npm/bin/npm-cli.js" })).toBe("npm");
  });

  it("falls back to unknown with no evidence", () => {
    expect(detectPackageManager({})).toBe("unknown");
  });
});

describe("suggestedUpdateCommand", () => {
  it("suggests the matching command per package manager", () => {
    expect(suggestedUpdateCommand("pnpm")).toContain("pnpm add -g");
    expect(suggestedUpdateCommand("yarn")).toContain("yarn global add");
    expect(suggestedUpdateCommand("npm")).toContain("npm install --global");
  });

  it("falls back to the officially supported npm instruction when unknown", () => {
    expect(suggestedUpdateCommand("unknown")).toContain("npm install --global");
  });
});
