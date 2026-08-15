import { z } from "zod";

/**
 * Runtime configuration shape (ARCHITECTURE.md §17, §59).
 * apiKey is intentionally optional here — its absence is a valid state
 * (surfaced later as CredentialStatus 'missing'), not a config error.
 */
export const AppConfigSchema = z.object({
  ai: z.object({
    provider: z.enum(["nvidia", "fake"]).default("nvidia"),
    baseUrl: z.string().url().default("https://integrate.api.nvidia.com"),
    apiKey: z.string().optional(),
    model: z.string().default(""),
  }),
  speech: z.object({
    enabled: z.boolean().default(false),
    kokoroModelDir: z.string().optional(),
    defaultVoice: z.string().default("af_heart"),
    defaultSpeed: z.number().positive().default(1.0),
    /** Opt-in only: sends learner text to Microsoft's Edge Read Aloud service, unlike on-device Kokoro (NVIDIA_NIM.md §40, §43). */
    onlineFallbackEnabled: z.boolean().default(false),
    edgeDefaultVoice: z.string().default("en-US-AriaNeural"),
  }),
  learning: z.object({
    dailyMinutes: z.number().int().positive().default(20),
    newItemsPerSession: z.number().int().positive().default(8),
  }),
  dataDir: z.string().min(1),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
