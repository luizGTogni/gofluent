import { isNewerVersion, normalizeVersion } from "./version.js";
import type { UpdateSource } from "./update-source.js";

/** UPDATER.md §11 Update Available. */
export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  tag: string;
  releaseNotes?: string;
}

/**
 * UPDATER.md §21 Update Checker. Pure orchestration over an injected
 * `UpdateSource` — fetches the latest stable release, normalizes both
 * versions, and returns `UpdateInfo` only for a strictly newer release
 * (§5 "never automatically downgrade").
 */
export class UpdateChecker {
  constructor(
    private readonly source: UpdateSource,
    private readonly currentVersion: string,
  ) {}

  async checkForUpdate(signal?: AbortSignal): Promise<UpdateInfo | null> {
    const release = await this.source.latestStable(signal);
    if (!release) return null;

    const current = normalizeVersion(this.currentVersion);
    const latest = normalizeVersion(release.version);
    if (!isNewerVersion(current, latest)) return null;

    return {
      currentVersion: current, latestVersion: latest, tag: release.tag,
      ...(release.releaseNotes !== undefined ? { releaseNotes: release.releaseNotes } : {}),
    };
  }
}
