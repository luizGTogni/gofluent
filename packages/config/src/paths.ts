import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Cross-platform application data directory (ARCHITECTURE.md §23, DATABASE.md §4).
 * Linux:   ~/.local/share/gofluent
 * Windows: %APPDATA%\GoFluent
 * Override with GOFLUENT_DATA_DIR (used by tests and advanced setups).
 */
export function resolveDataDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.GOFLUENT_DATA_DIR;
  if (override && override.trim().length > 0) {
    return override;
  }

  if (process.platform === "win32") {
    const appData = env.APPDATA ?? join(homedir(), "AppData", "Roaming");
    return join(appData, "GoFluent");
  }

  const xdgDataHome = env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return join(xdgDataHome, "gofluent");
}

export interface DataDirLayout {
  root: string;
  databaseFile: string;
  cacheDir: string;
  audioDir: string;
  logsDir: string;
  configDir: string;
}

export function resolveDataDirLayout(env: NodeJS.ProcessEnv = process.env): DataDirLayout {
  const root = resolveDataDir(env);
  const child = (name: string) => `${root}/${name}`;
  return {
    root,
    databaseFile: child("gofluent.db"),
    cacheDir: child("cache"),
    audioDir: child("audio"),
    logsDir: child("logs"),
    configDir: child("config"),
  };
}

/** Where the on-disk half of the layered config (ARCHITECTURE.md §59) — including saved API keys — lives. */
export function resolveConfigFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return `${resolveDataDirLayout(env).configDir}/config.json`;
}
