import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ConfigurationError } from "@gofluent/core";

export type StoredConfig = Record<string, unknown>;

function isPlainObject(value: unknown): value is StoredConfig {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base: StoredConfig, patch: StoredConfig): StoredConfig {
  const out: StoredConfig = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = base[key];
    out[key] = isPlainObject(value) && isPlainObject(existing) ? deepMerge(existing, value) : value;
  }
  return out;
}

/** Missing file is a valid state (nothing saved yet); malformed JSON is a real config error. */
export function readStoredConfig(path: string): StoredConfig {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as StoredConfig;
  } catch (cause) {
    throw new ConfigurationError(`Failed to parse config file at ${path}`, { cause });
  }
}

/**
 * Persists a partial config patch (e.g. `{ ai: { apiKey: "..." } }`), merging
 * with whatever is already on disk. Written with owner-only permissions since
 * this file can hold API keys.
 */
export function saveStoredConfig(path: string, patch: StoredConfig): void {
  const merged = deepMerge(readStoredConfig(path), patch);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`, { mode: 0o600 });
}
