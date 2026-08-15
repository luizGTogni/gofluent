import { AIProviderError } from "@gofluent/core";
import type { ProviderId } from "./id.js";

/** PROVIDER.md §34 — stable categories adapters map external failures into. */
export type ProviderErrorCode =
  | "MISSING_CREDENTIAL"
  | "INVALID_CREDENTIAL"
  | "NETWORK"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "MODEL_NOT_FOUND"
  | "UNSUPPORTED_CAPABILITY"
  | "INVALID_REQUEST"
  | "INVALID_RESPONSE"
  | "SERVER"
  | "CANCELLED";

/**
 * Normalized provider failure. The TUI reads `code`, never raw HTTP status
 * codes or driver-specific error shapes (PROVIDER.md §35).
 */
export class ProviderError extends AIProviderError {
  readonly code: ProviderErrorCode;
  readonly provider: ProviderId;

  constructor(
    code: ProviderErrorCode,
    provider: ProviderId,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.code = code;
    this.provider = provider;
  }
}
