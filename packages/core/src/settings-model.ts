/** Simple key-value application settings (DATABASE.md `settings`). */
export interface SettingsRepository {
  get(key: string): unknown | null;
  set(key: string, value: unknown, updatedAt: string): void;
}
