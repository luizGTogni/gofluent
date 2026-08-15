import { readFileSync } from "node:fs";
import { ConfigurationError } from "@gofluent/core";
import { AppConfigSchema, type AppConfig } from "./schema.js";
import { resolveDataDir } from "./paths.js";

/**
 * Layered configuration: defaults → config file → environment variables
 * (ARCHITECTURE.md §59). Env vars win because secrets should prefer them.
 */
export interface LoadConfigOptions {
  env?: NodeJS.ProcessEnv;
  configFilePath?: string;
}

function readConfigFile(path: string | undefined): Record<string, unknown> {
  if (!path) return {};
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (cause) {
    throw new ConfigurationError(`Failed to read config file at ${path}`, { cause });
  }
}

export function loadConfig(options: LoadConfigOptions = {}): AppConfig {
  const env = options.env ?? process.env;
  const fileConfig = readConfigFile(options.configFilePath);

  const merged = {
    ai: {
      provider: env.GOFLUENT_AI_PROVIDER ?? (fileConfig as any).ai?.provider,
      baseUrl: env.NVIDIA_NIM_BASE_URL ?? (fileConfig as any).ai?.baseUrl,
      apiKey: env.NVIDIA_API_KEY ?? (fileConfig as any).ai?.apiKey,
      model: env.NVIDIA_NIM_MODEL ?? (fileConfig as any).ai?.model,
    },
    speech: {
      enabled: parseOptionalBoolean(env.GOFLUENT_SPEECH_ENABLED) ?? (fileConfig as any).speech?.enabled,
    },
    learning: {
      dailyMinutes:
        parseOptionalInt(env.GOFLUENT_DAILY_MINUTES) ?? (fileConfig as any).learning?.dailyMinutes,
      newItemsPerSession:
        parseOptionalInt(env.GOFLUENT_NEW_ITEMS_PER_SESSION) ??
        (fileConfig as any).learning?.newItemsPerSession,
    },
    dataDir: env.GOFLUENT_DATA_DIR ?? (fileConfig as any).dataDir ?? resolveDataDir(env),
  };

  const stripped = stripUndefinedDeep(merged);
  const parsed = AppConfigSchema.safeParse(stripped);

  if (!parsed.success) {
    throw new ConfigurationError(
      `Invalid configuration: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  }

  return parsed.data;
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedDeep) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[key] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}
