import { createHash } from "node:crypto";

/**
 * ARCHITECTURE.md §49 — cache key incorporates text hash / voice / speed /
 * provider. Deterministic and pure so cache lookups are unit-testable
 * without a real TTS runtime.
 */
export function hashText(text: string): string {
  return createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}
