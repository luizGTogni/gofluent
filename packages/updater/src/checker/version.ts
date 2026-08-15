/**
 * UPDATER.md §5 SemVer Comparison. Deliberately dependency-free — GoFluent's
 * release tags are plain `MAJOR.MINOR.PATCH` (optionally `-prerelease`), so a
 * small hand-rolled comparator avoids pulling in a full semver package.
 */
export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string | undefined;
}

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/** Strips a leading `v` and splits into numeric components (UPDATER.md §5 "normalize v0.2.0 to 0.2.0"). */
export function parseVersion(raw: string): ParsedVersion | null {
  const match = VERSION_PATTERN.exec(raw.trim());
  if (!match) return null;
  const [, major, minor, patch, prerelease] = match;
  return {
    major: Number(major), minor: Number(minor), patch: Number(patch),
    ...(prerelease !== undefined ? { prerelease } : {}),
  };
}

export function normalizeVersion(raw: string): string {
  const parsed = parseVersion(raw);
  if (!parsed) return raw.trim().replace(/^v/, "");
  return `${parsed.major}.${parsed.minor}.${parsed.patch}${parsed.prerelease ? `-${parsed.prerelease}` : ""}`;
}

/** -1 if a<b, 0 if equal, 1 if a>b. A release with a prerelease tag sorts before its stable counterpart. */
export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === undefined) return 1;
  if (b.prerelease === undefined) return -1;
  return a.prerelease < b.prerelease ? -1 : a.prerelease > b.prerelease ? 1 : 0;
}

/** UPDATER.md §5 — "never automatically downgrade": only true when `latest` strictly outranks `current`. */
export function isNewerVersion(current: string, latest: string): boolean {
  const parsedCurrent = parseVersion(current);
  const parsedLatest = parseVersion(latest);
  if (!parsedCurrent || !parsedLatest) return false;
  return compareVersions(parsedLatest, parsedCurrent) > 0;
}
