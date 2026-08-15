/**
 * UPDATER.md — version discovery, update notification, package-manager
 * instruction flow (v0.1.0+ MVP scope, §1-29), plus the deterministic,
 * platform-agnostic primitives (checksum, staging, archive-path safety) a
 * future standalone self-updater would build on (§30-38).
 */
export * from "./checker/update-source.js";
export * from "./checker/errors.js";
export * from "./checker/version.js";
export * from "./checker/update-checker.js";
export * from "./checker/github-release-source.js";
export * from "./checker/fake-source.js";
export * from "./checker/package-manager-detection.js";

export * from "./standalone/errors.js";
export * from "./standalone/checksum.js";
export * from "./standalone/staging.js";
export * from "./standalone/archive-safety.js";
