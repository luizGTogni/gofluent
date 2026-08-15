import { randomUUID } from "node:crypto";
import type { DeviceIdentity, DeviceIdentityRepository } from "@gofluent/core";

/**
 * Idempotent: generates this installation's stable `device_id` once
 * (ROADMAP Phase 8, DATABASE.md §104) and returns the existing one on every
 * later call.
 */
export function ensureDeviceIdentity(repository: DeviceIdentityRepository, now: string): DeviceIdentity {
  const existing = repository.get();
  if (existing) return existing;
  const identity: DeviceIdentity = { deviceId: randomUUID(), createdAt: now };
  repository.create(identity);
  return identity;
}
