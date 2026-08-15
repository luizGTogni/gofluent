import type { z } from "zod";
import { ProviderError } from "../provider/errors.js";
import type { OutputContract } from "../provider/request.js";

/**
 * Wraps a Zod schema as an `OutputContract` (PROVIDER.md §27). This is the
 * mandatory validation layer for all AI-generated output (PRD §36,
 * ARCHITECTURE.md §36 "Layer 1 — Structural Validation") — provider-side
 * structured-output guarantees never replace it.
 */
export function zodOutputContract<T>(
  schemaName: string,
  schema: z.ZodType<T>,
  providerId: string,
): OutputContract<T> {
  return {
    schemaName,
    parse(value: unknown): T {
      const result = schema.safeParse(value);
      if (!result.success) {
        throw new ProviderError(
          "INVALID_RESPONSE",
          providerId,
          `Response failed schema "${schemaName}": ${result.error.message}`,
        );
      }
      return result.data;
    },
  };
}
