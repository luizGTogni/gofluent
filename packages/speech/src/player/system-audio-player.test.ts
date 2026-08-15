import { describe, expect, it } from "vitest";
import { SystemAudioPlayer } from "./system-audio-player.js";

describe("SystemAudioPlayer", () => {
  it("degrades to unavailable instead of throwing when no player is found", async () => {
    const player = new SystemAudioPlayer({ commandExists: async () => false, platform: "linux" });
    await expect(player.isAvailable()).resolves.toEqual({
      available: false,
      reason: "No supported audio player found on this system",
    });
  });

  it("reports available once a candidate command resolves", async () => {
    const player = new SystemAudioPlayer({ commandExists: async (cmd) => cmd === "ffplay", platform: "linux" });
    await expect(player.isAvailable()).resolves.toEqual({ available: true });
  });

  it("rejects with SpeechError UNAVAILABLE from play() when nothing is found", async () => {
    const player = new SystemAudioPlayer({ commandExists: async () => false, platform: "linux" });
    await expect(player.play({ filePath: "/tmp/does-not-matter.wav" })).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
});
