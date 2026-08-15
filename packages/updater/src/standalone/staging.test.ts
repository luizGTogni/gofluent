import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stageVerifiedFile } from "./staging.js";
import { StandaloneUpdateError } from "./errors.js";

describe("stageVerifiedFile", () => {
  let dir: string;
  let partPath: string;
  let finalPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gofluent-staging-"));
    partPath = join(dir, "download.part");
    finalPath = join(dir, "gofluent-linux");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("renames the .part file into place once the checksum matches", async () => {
    writeFileSync(partPath, "binary contents");
    const expected = createHash("sha256").update("binary contents").digest("hex");

    await stageVerifiedFile({ partPath, finalPath, expectedSha256: expected });

    expect(existsSync(partPath)).toBe(false);
    expect(readFileSync(finalPath, "utf-8")).toBe("binary contents");
  });

  it("deletes the .part file and never creates finalPath on a checksum mismatch", async () => {
    writeFileSync(partPath, "tampered contents");

    await expect(stageVerifiedFile({ partPath, finalPath, expectedSha256: "0".repeat(64) })).rejects.toMatchObject({
      code: "CHECKSUM_MISMATCH",
    } satisfies Partial<StandaloneUpdateError>);

    expect(existsSync(partPath)).toBe(false);
    expect(existsSync(finalPath)).toBe(false);
  });

  it("normalizes a missing .part file into STAGING_FAILED", async () => {
    await expect(stageVerifiedFile({ partPath, finalPath, expectedSha256: "0".repeat(64) })).rejects.toMatchObject({
      code: "STAGING_FAILED",
    } satisfies Partial<StandaloneUpdateError>);
  });
});
