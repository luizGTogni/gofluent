import { describe, expect, it } from "vitest";
import { resolveDataDir, resolveDataDirLayout } from "./paths.js";

describe("resolveDataDir", () => {
  it("respects GOFLUENT_DATA_DIR override", () => {
    expect(resolveDataDir({ GOFLUENT_DATA_DIR: "/custom/path" })).toBe("/custom/path");
  });

  it("uses APPDATA on Windows", () => {
    if (process.platform !== "win32") return;
    const dir = resolveDataDir({ APPDATA: "C:\\Users\\test\\AppData\\Roaming" });
    expect(dir).toContain("GoFluent");
  });

  it("uses XDG_DATA_HOME / ~/.local/share on Linux", () => {
    if (process.platform === "win32") return;
    const dir = resolveDataDir({ XDG_DATA_HOME: "/home/test/.local/share" });
    expect(dir).toBe("/home/test/.local/share/gofluent");
  });
});

describe("resolveDataDirLayout", () => {
  it("derives db/cache/audio/logs/config paths from the root", () => {
    const layout = resolveDataDirLayout({ GOFLUENT_DATA_DIR: "/custom/path" });
    expect(layout.root).toBe("/custom/path");
    expect(layout.databaseFile.endsWith("gofluent.db")).toBe(true);
    expect(layout.cacheDir.startsWith("/custom/path")).toBe(true);
  });
});
