import type { NvidiaConfig } from "./config.js";
import { nvidiaRequest } from "./client.js";
import type { CredentialStatus } from "../../provider/credentials.js";
import { ProviderError } from "../../provider/errors.js";

/**
 * NVIDIA_NIM.md §9 — distinguishes missing/invalid credential from network
 * failure. A lightweight authenticated `GET /v1/models` call is the probe.
 */
export async function validateNvidiaCredentials(
  config: NvidiaConfig,
  signal?: AbortSignal,
): Promise<CredentialStatus> {
  if (!config.apiKey || config.apiKey.trim().length === 0) {
    return { status: "missing" };
  }

  try {
    await nvidiaRequest(config, "/v1/models", { method: "GET" }, signal);
    return { status: "valid" };
  } catch (error) {
    if (error instanceof ProviderError) {
      if (error.code === "INVALID_CREDENTIAL") {
        return { status: "invalid", reason: error.message };
      }
      if (error.code === "NETWORK" || error.code === "TIMEOUT" || error.code === "SERVER") {
        return { status: "unreachable", reason: error.message };
      }
    }
    throw error;
  }
}
