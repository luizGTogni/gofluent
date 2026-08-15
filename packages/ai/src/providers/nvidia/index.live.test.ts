import { describe, expect, it } from "vitest";
import { NvidiaNimProvider } from "./index.js";

/**
 * Opt-in live test against real NVIDIA NIM (NVIDIA_NIM.md §46).
 * Run with: pnpm test:ai:live
 * Requires NVIDIA_API_KEY (and optionally NVIDIA_NIM_BASE_URL / NVIDIA_NIM_MODEL) in env.
 */
const apiKey = process.env.NVIDIA_API_KEY;

describe.skipIf(!apiKey)("NvidiaNimProvider (live)", () => {
  it("validates real credentials", async () => {
    const provider = new NvidiaNimProvider({
      baseUrl: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com",
      apiKey: apiKey as string,
      model: process.env.NVIDIA_NIM_MODEL ?? "",
    });

    const status = await provider.validateCredentials();
    expect(status.status).toBe("valid");
  });
});
