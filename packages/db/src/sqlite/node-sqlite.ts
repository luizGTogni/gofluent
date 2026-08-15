import type * as NodeSqlite from "node:sqlite";

/**
 * `node:sqlite` is registered only under its prefixed specifier, which
 * confuses some bundler/test-runner builtin-module detection (it strips the
 * "node:" prefix before checking `module.builtinModules`, which only lists
 * it with the prefix). `process.getBuiltinModule` sidesteps static import
 * resolution entirely and is stable in Node 22.3+/24.
 */
const nodeSqlite = process.getBuiltinModule("node:sqlite") as typeof NodeSqlite;

export const DatabaseSyncCtor = nodeSqlite.DatabaseSync;
export type DatabaseSyncInstance = InstanceType<typeof NodeSqlite.DatabaseSync>;
