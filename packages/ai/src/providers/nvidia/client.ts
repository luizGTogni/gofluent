import type { NvidiaConfig } from "./config.js";
import { DEFAULT_NVIDIA_TIMEOUT_MS } from "./config.js";
import { nvidiaFetchError, nvidiaHttpError } from "./errors.js";
import { ProviderError } from "../../provider/errors.js";

const PROVIDER_ID = "nvidia";
const USER_AGENT = "gofluent/0.1.0";

/**
 * Thin fetch wrapper (PROVIDER.md §37-38): auth header, timeout via
 * AbortSignal, user agent. Never logs the Authorization header
 * (ARCHITECTURE.md §89, NVIDIA_NIM.md §5).
 */
export async function nvidiaRequest(
  config: NvidiaConfig,
  path: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<unknown> {
  const timeoutSignal = AbortSignal.timeout(config.timeoutMs ?? DEFAULT_NVIDIA_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(new URL(path, config.baseUrl), {
      ...init,
      headers,
      signal: combinedSignal,
    });
  } catch (cause) {
    throw nvidiaFetchError(cause, PROVIDER_ID);
  }

  const bodyText = await response.text();

  if (!response.ok) {
    throw nvidiaHttpError(response.status, PROVIDER_ID, bodyText);
  }

  if (bodyText.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(bodyText);
  } catch (cause) {
    throw new ProviderError("INVALID_RESPONSE", PROVIDER_ID, "NVIDIA NIM returned non-JSON body", {
      cause,
    });
  }
}
