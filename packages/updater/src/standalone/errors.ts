/**
 * UPDATER.md §30-38 Future Standalone Binary Distribution. These primitives
 * (checksum verification, staging, archive-path safety) are the
 * deterministic, platform-agnostic pieces of a future self-updater — the
 * actual PlatformInstaller (replacing a running executable, Windows helper
 * process, Linux package-manager awareness) is explicitly out of scope for
 * the Node/npm MVP (UPDATER.md §36 "future work, not the Node/npm MVP path")
 * and is not implemented here.
 */
export type StandaloneUpdateErrorCode = "CHECKSUM_MISMATCH" | "UNSAFE_ARCHIVE_ENTRY" | "STAGING_FAILED";

export class StandaloneUpdateError extends Error {
  readonly code: StandaloneUpdateErrorCode;

  constructor(code: StandaloneUpdateErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StandaloneUpdateError";
    this.code = code;
  }
}
