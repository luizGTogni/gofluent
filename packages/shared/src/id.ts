import { randomUUID } from "node:crypto";

/**
 * GoFluent uses application-generated UUIDs for all entity IDs (DATABASE.md §9),
 * which keeps records provider-independent and safe to create offline.
 */
export function createId(): string {
  return randomUUID();
}
