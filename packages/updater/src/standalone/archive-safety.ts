/**
 * UPDATER.md §34 Archive Safety — reject path-traversal entries before a
 * future ZIP/tar extraction step. Pure predicate; the actual extraction
 * implementation is not part of the Node/npm MVP (see standalone/errors.ts).
 */
export function isSafeArchiveEntryPath(entryPath: string): boolean {
  if (entryPath.length === 0) return false;
  const normalized = entryPath.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) return false; // absolute path (POSIX or Windows drive letter)
  const segments = normalized.split("/");
  return segments.every((segment) => segment !== "..");
}
