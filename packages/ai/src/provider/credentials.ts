/**
 * PROVIDER.md §10 — network failure must never be conflated with an invalid key.
 */
export type CredentialStatus =
  | { status: "valid" }
  | { status: "missing" }
  | { status: "invalid"; reason?: string }
  | { status: "unreachable"; reason?: string };
