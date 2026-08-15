import { rename, unlink } from "node:fs/promises";
import { verifyChecksum } from "./checksum.js";
import { StandaloneUpdateError } from "./errors.js";

/**
 * UPDATER.md §33 Staging: "never install a partial download." The caller is
 * expected to have already downloaded to `partPath` (a temporary `.part`
 * file) and closed/flushed it; this verifies the checksum and only then
 * atomically renames it into place. On checksum mismatch the `.part` file is
 * deleted and `finalPath` is never touched (§32 "checksum mismatch → abort
 * → current installation remains untouched").
 */
export interface StageVerifiedFileInput {
  partPath: string;
  finalPath: string;
  expectedSha256: string;
}

export async function stageVerifiedFile(input: StageVerifiedFileInput): Promise<void> {
  const verified = await verifyChecksum(input.partPath, input.expectedSha256).catch((cause) => {
    throw new StandaloneUpdateError("STAGING_FAILED", `Could not read downloaded file at ${input.partPath}`, { cause });
  });

  if (!verified) {
    await unlink(input.partPath).catch(() => undefined);
    throw new StandaloneUpdateError("CHECKSUM_MISMATCH", `Downloaded file at ${input.partPath} does not match the expected SHA-256 checksum`);
  }

  try {
    await rename(input.partPath, input.finalPath);
  } catch (cause) {
    throw new StandaloneUpdateError("STAGING_FAILED", `Could not stage verified file to ${input.finalPath}`, { cause });
  }
}
