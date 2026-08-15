import { loadConfig, resolveDataDirLayout, type AppConfig } from "@gofluent/config";
import { openDatabase, runMigrations, type DatabaseSync } from "@gofluent/db";

/**
 * Composition root (ARCHITECTURE.md §22, §74): load config, resolve the data
 * directory, open SQLite, run migrations. Repositories/providers/application
 * services are assembled here starting Phase 1/2. Failure here must produce
 * a readable terminal error before any Ink rendering happens.
 */
export interface BootstrapResult {
  config: AppConfig;
  db: DatabaseSync;
  appliedMigrations: string[];
}

export function bootstrap(): BootstrapResult {
  const config = loadConfig();
  const layout = resolveDataDirLayout();

  const db = openDatabase(layout.databaseFile);
  const appliedMigrations = runMigrations(db);

  return { config, db, appliedMigrations };
}
