import { describe, expect, it } from "vitest";
import { FakeUpdateSource } from "./fake-source.js";
import { UpdateChecker } from "./update-checker.js";

describe("UpdateChecker", () => {
  it("returns UpdateInfo when a newer stable release exists", async () => {
    const source = new FakeUpdateSource({ version: "0.2.0", tag: "v0.2.0", releaseNotes: "New stuff", assets: [] });
    const checker = new UpdateChecker(source, "0.1.0");
    const result = await checker.checkForUpdate();
    expect(result).toEqual({ currentVersion: "0.1.0", latestVersion: "0.2.0", tag: "v0.2.0", releaseNotes: "New stuff" });
  });

  it("returns null when already on the latest version", async () => {
    const source = new FakeUpdateSource({ version: "0.1.0", tag: "v0.1.0", assets: [] });
    const checker = new UpdateChecker(source, "0.1.0");
    expect(await checker.checkForUpdate()).toBeNull();
  });

  it("never suggests a downgrade", async () => {
    const source = new FakeUpdateSource({ version: "0.1.0", tag: "v0.1.0", assets: [] });
    const checker = new UpdateChecker(source, "0.2.0");
    expect(await checker.checkForUpdate()).toBeNull();
  });

  it("returns null when the source has no release at all", async () => {
    const source = new FakeUpdateSource(null);
    const checker = new UpdateChecker(source, "0.1.0");
    expect(await checker.checkForUpdate()).toBeNull();
  });
});
