/**
 * Cloud-sync readiness (ROADMAP Phase 8, DATABASE.md §103-105). Per
 * DATABASE.md §104 "do not add all sync fields until cloud sync is actually
 * planned" — this stays a small, decoupled changelog/tombstone primitive
 * rather than retrofitting `device_id`/`sync_version`/`deleted_at` columns
 * onto every existing table. No sync protocol or conflict resolution is
 * implemented (ARCHITECTURE.md §95); this only makes the future transition
 * possible without a schema redesign.
 */
export interface DeviceIdentity {
  deviceId: string;
  createdAt: string;
}

export interface DeviceIdentityRepository {
  get(): DeviceIdentity | null;
  create(identity: DeviceIdentity): void;
}

export interface SyncState {
  id: string;
  entityType: string;
  entityId: string;
  deviceId: string;
  syncVersion: number;
  deletedAt?: string | undefined;
  updatedAt: string;
}

export interface SyncStateRepository {
  get(entityType: string, entityId: string): SyncState | null;
  upsert(state: SyncState): void;
  listSince(syncVersion: number, limit: number): SyncState[];
}
