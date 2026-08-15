import { describe, expect, it } from "vitest";
import { detectPlayer } from "./player-detection.js";

describe("detectPlayer", () => {
  it("returns null when no candidate command exists (degrade, don't throw)", async () => {
    const player = await detectPlayer(async () => false, "linux");
    expect(player).toBeNull();
  });

  it("picks the first available candidate in priority order on linux", async () => {
    const player = await detectPlayer(async (command) => command === "mpg123", "linux");
    expect(player?.command).toBe("mpg123");
  });

  it("uses afplay on darwin", async () => {
    const player = await detectPlayer(async (command) => command === "afplay", "darwin");
    expect(player?.command).toBe("afplay");
  });

  it("uses powershell on win32", async () => {
    const player = await detectPlayer(async (command) => command === "powershell", "win32");
    expect(player?.command).toBe("powershell");
  });
});
