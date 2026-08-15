import type { NvidiaConfig } from "./config.js";
import { nvidiaRequest } from "./client.js";
import type { Model } from "../../provider/model.js";

interface NvidiaModelListResponse {
  data?: Array<{ id: string }>;
}

/**
 * NVIDIA_NIM.md §13-14 — model discovery is separate from capability
 * discovery; the list endpoint does not expose everything GoFluent needs,
 * so capabilities here are conservative built-in defaults (PROVIDER.md §23).
 */
export async function listNvidiaModels(config: NvidiaConfig, signal?: AbortSignal): Promise<Model[]> {
  const response = (await nvidiaRequest(config, "/v1/models", { method: "GET" }, signal)) as
    | NvidiaModelListResponse
    | undefined;

  const rawModels = response?.data ?? [];

  return rawModels.map((raw) => ({
    id: raw.id,
    provider: "nvidia",
    displayName: raw.id,
    capabilities: {
      streaming: true,
      structuredOutput: { type: "json" },
      reasoning: { type: "unsupported" },
      tools: { supported: false },
      vision: false,
      sampling: { temperature: true, topP: true, maxOutputTokens: true },
    },
    metadata: {},
  }));
}
