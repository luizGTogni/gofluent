import { describe, expect, it } from "vitest";
import { runMigrations } from "./migrations/migrate.js";
import { openDatabase } from "./sqlite/connection.js";
import { SqliteAudioAssetRepository } from "./repositories.js";

describe("SqliteAudioAssetRepository", () => {
  it("caches by text hash / voice / speed / provider (ARCHITECTURE.md §49)", () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    const repo = new SqliteAudioAssetRepository(db);
    const now = "2026-01-01T00:00:00.000Z";

    expect(repo.findByCacheKey("hash-1", "af_heart", 1.0, "kokoro")).toBeNull();

    repo.upsert({
      id: "asset-1",
      textHash: "hash-1",
      voice: "af_heart",
      speed: 1.0,
      provider: "kokoro",
      filePath: "/audio/asset-1.wav",
      durationMs: 1200,
      createdAt: now,
    });

    const hit = repo.findByCacheKey("hash-1", "af_heart", 1.0, "kokoro");
    expect(hit).not.toBeNull();
    expect(hit?.filePath).toBe("/audio/asset-1.wav");
    expect(repo.get("asset-1")?.durationMs).toBe(1200);

    expect(repo.findByCacheKey("hash-1", "am_adam", 1.0, "kokoro")).toBeNull();
  });

  it("upsert is idempotent for the same id", () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    const repo = new SqliteAudioAssetRepository(db);
    const now = "2026-01-01T00:00:00.000Z";
    const asset = { id: "asset-2", textHash: "hash-2", voice: "af_heart", speed: 1.0, provider: "kokoro", filePath: "/audio/asset-2.wav", createdAt: now };
    repo.upsert(asset);
    repo.upsert({ ...asset, filePath: "/audio/asset-2-updated.wav" });
    expect(repo.get("asset-2")?.filePath).toBe("/audio/asset-2-updated.wav");
    expect((db.prepare("SELECT count(*) AS count FROM audio_assets").get() as { count: number }).count).toBe(1);
  });
});
