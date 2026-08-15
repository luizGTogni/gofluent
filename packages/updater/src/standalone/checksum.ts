import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

/** UPDATER.md §32 Standalone Artifact Integrity — SHA-256 is the minimum bar. */
export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk: string | Buffer) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function verifyChecksum(filePath: string, expectedSha256: string): Promise<boolean> {
  const actual = await sha256File(filePath);
  return actual.toLowerCase() === expectedSha256.trim().toLowerCase();
}
