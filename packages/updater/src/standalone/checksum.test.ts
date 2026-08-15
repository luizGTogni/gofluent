import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sha256File, verifyChecksum } from "./checksum.js";

describe("checksum", () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gofluent-checksum-"));
    filePath = join(dir, "artifact.bin");
    writeFileSync(filePath, "hello gofluent");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("computes the sha256 of a file", async () => {
    const expected = createHash("sha256").update("hello gofluent").digest("hex");
    expect(await sha256File(filePath)).toBe(expected);
  });

  it("verifyChecksum is case-insensitive and trims whitespace", async () => {
    const expected = createHash("sha256").update("hello gofluent").digest("hex");
    expect(await verifyChecksum(filePath, expected.toUpperCase())).toBe(true);
    expect(await verifyChecksum(filePath, `  ${expected}  `)).toBe(true);
  });

  it("returns false for a mismatched checksum", async () => {
    expect(await verifyChecksum(filePath, "0".repeat(64))).toBe(false);
  });
});
