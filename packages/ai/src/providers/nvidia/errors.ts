import { ProviderError, type ProviderErrorCode } from "../../provider/errors.js";

/** NVIDIA_NIM.md §27 — normalize NVIDIA's OpenAI-compatible HTTP errors. */
export function mapHttpStatusToErrorCode(status: number): ProviderErrorCode {
  if (status === 401 || status === 403) return "INVALID_CREDENTIAL";
  if (status === 404) return "MODEL_NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER";
  return "INVALID_REQUEST";
}

export function nvidiaHttpError(status: number, providerId: string, body: string): ProviderError {
  return new ProviderError(
    mapHttpStatusToErrorCode(status),
    providerId,
    `NVIDIA NIM request failed with status ${status}: ${body.slice(0, 500)}`,
  );
}

export function nvidiaFetchError(cause: unknown, providerId: string): ProviderError {
  if (cause instanceof Error && cause.name === "AbortError") {
    return new ProviderError("CANCELLED", providerId, "NVIDIA NIM request was cancelled", { cause });
  }
  if (cause instanceof Error && cause.name === "TimeoutError") {
    return new ProviderError("TIMEOUT", providerId, "NVIDIA NIM request timed out", { cause });
  }
  return new ProviderError("NETWORK", providerId, "Failed to reach NVIDIA NIM", { cause });
}
