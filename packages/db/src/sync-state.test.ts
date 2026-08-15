import { describe, expect, it } from "vitest";
import type { SyncState } from "@gofluent/core";
import { openDatabase } from "./sqlite/connection.js";
import { runMigrations } from "./migrations/migrate.js";
import { ensureDeviceIdentity } from "./device.js";
import { SqliteDeviceIdentityRepository, SqliteSyncStateRepository } from "./repositories.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  return db;
}

describe("ensureDeviceIdentity", () => {
  it("generates a device_id on first call and reuses it afterwards", () => {
    const db = seededDb();
    const repo = new SqliteDeviceIdentityRepository(db);

    const first = ensureDeviceIdentity(repo, now);
    expect(first.deviceId).toMatch(/^[0-9a-f-]{36}$/);

    const second = ensureDeviceIdentity(repo, "2026-01-02T00:00:00.000Z");
    expect(second.deviceId).toBe(first.deviceId);
    expect(second.createdAt).toBe(now);

    const rowCount = (db.prepare("SELECT COUNT(*) AS count FROM device_identity").get() as { count: number }).count;
    expect(rowCount).toBe(1);
  });
});

describe("SqliteSyncStateRepository", () => {
  it("upserts a sync-state row keyed by (entityType, entityId)", () => {
    const db = seededDb();
    const repo = new SqliteSyncStateRepository(db);
    const deviceId = ensureDeviceIdentity(new SqliteDeviceIdentityRepository(db), now).deviceId;

    const state: SyncState = { id: "s1", entityType: "learner_profiles", entityId: "profile-1", deviceId, syncVersion: 1, updatedAt: now };
    repo.upsert(state);
    expect(repo.get("learner_profiles", "profile-1")?.syncVersion).toBe(1);

    repo.upsert({ ...state, syncVersion: 2, updatedAt: "2026-01-02T00:00:00.000Z" });
    expect(repo.get("learner_profiles", "profile-1")?.syncVersion).toBe(2);

    const rowCount = (db.prepare("SELECT COUNT(*) AS count FROM sync_state").get() as { count: number }).count;
    expect(rowCount).toBe(1);
  });

  it("marks a tombstone via deletedAt without removing the row", () => {
    const db = seededDb();
    const repo = new SqliteSyncStateRepository(db);
    const deviceId = ensureDeviceIdentity(new SqliteDeviceIdentityRepository(db), now).deviceId;

    repo.upsert({ id: "s1", entityType: "content", entityId: "c1", deviceId, syncVersion: 1, updatedAt: now });
    repo.upsert({ id: "s1", entityType: "content", entityId: "c1", deviceId, syncVersion: 2, deletedAt: "2026-01-03T00:00:00.000Z", updatedAt: "2026-01-03T00:00:00.000Z" });

    const state = repo.get("content", "c1");
    expect(state?.deletedAt).toBe("2026-01-03T00:00:00.000Z");
  });

  it("lists entities changed since a given sync version, ordered ascending", () => {
    const db = seededDb();
    const repo = new SqliteSyncStateRepository(db);
    const deviceId = ensureDeviceIdentity(new SqliteDeviceIdentityRepository(db), now).deviceId;

    repo.upsert({ id: "s1", entityType: "content", entityId: "a", deviceId, syncVersion: 1, updatedAt: now });
    repo.upsert({ id: "s2", entityType: "content", entityId: "b", deviceId, syncVersion: 3, updatedAt: now });
    repo.upsert({ id: "s3", entityType: "content", entityId: "c", deviceId, syncVersion: 2, updatedAt: now });

    const changed = repo.listSince(1, 10);
    expect(changed.map((s) => s.entityId)).toEqual(["c", "b"]);
  });
});
