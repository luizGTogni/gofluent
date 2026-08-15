/**
 * All persisted timestamps use UTC ISO 8601 text (DATABASE.md §10).
 */
export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(date: Date): string {
  return date.toISOString();
}
