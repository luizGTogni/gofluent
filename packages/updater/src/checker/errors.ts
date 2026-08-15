/** UPDATER.md §22 — normalized update-check failure categories. */
export type UpdateErrorCode = "NETWORK" | "TIMEOUT" | "RATE_LIMITED" | "INVALID_RELEASE" | "INVALID_VERSION" | "SOURCE_UNAVAILABLE";

/**
 * UPDATER.md §2 "update checking must never prevent the learner from opening
 * GoFluent" — this is always caller-caught and logged, never surfaced as a
 * fatal error (UPDATER.md §9 non-blocking failure).
 */
export class UpdateError extends Error {
  readonly code: UpdateErrorCode;

  constructor(code: UpdateErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UpdateError";
    this.code = code;
  }
}
