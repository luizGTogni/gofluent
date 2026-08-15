-- 0007_sync_state.sql — cloud-sync readiness primitives (DATABASE.md §103-105, Phase 8)

-- Single-row table: this installation's stable device identity.
CREATE TABLE device_identity (
  device_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

-- Generic per-entity changelog/tombstone, decoupled from existing tables
-- (DATABASE.md §104 — do not add sync fields to every table until a sync
-- protocol is actually built).
CREATE TABLE sync_state (
  id TEXT PRIMARY KEY,

  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,

  device_id TEXT NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,

  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_sync_state_entity
ON sync_state(entity_type, entity_id);

CREATE INDEX idx_sync_state_version
ON sync_state(sync_version);
