import { UpdateError } from "./errors.js";
import { normalizeVersion, parseVersion } from "./version.js";
import type { ReleaseAsset, ReleaseInfo, UpdateSource } from "./update-source.js";

export interface GitHubReleaseSourceOptions {
  owner: string;
  repo: string;
  /** UPDATER.md §25 — `gofluent/<version>` User-Agent. */
  currentVersion: string;
  baseUrl?: string;
  timeoutMs?: number;
}

interface GitHubReleaseResponse {
  tag_name?: string;
  draft?: boolean;
  prerelease?: boolean;
  body?: string;
  published_at?: string;
  assets?: Array<{ name?: string; browser_download_url?: string; size?: number }>;
}

const DEFAULT_BASE_URL = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * UPDATER.md §3 Source of Truth (GitHub Releases) + §4 Stable Channel.
 * `/releases/latest` already excludes drafts/prereleases per GitHub's own
 * semantics, but this still checks the flags defensively — the spec calls
 * out draft/prerelease rejection explicitly (§28 Update Tests).
 */
export class GitHubReleaseSource implements UpdateSource {
  private readonly owner: string;
  private readonly repo: string;
  private readonly currentVersion: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: GitHubReleaseSourceOptions) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.currentVersion = options.currentVersion;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async latestStable(signal?: AbortSignal): Promise<ReleaseInfo | null> {
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": `gofluent/${this.currentVersion}` },
        signal: combinedSignal,
      });
    } catch (cause) {
      if (signal?.aborted) throw new UpdateError("NETWORK", "GitHub release check was cancelled", { cause });
      if (cause instanceof Error && cause.name === "TimeoutError") throw new UpdateError("TIMEOUT", "GitHub release check timed out", { cause });
      throw new UpdateError("NETWORK", "Could not reach GitHub Releases", { cause });
    }

    if (response.status === 404) return null;
    if (response.status === 403 || response.status === 429) {
      throw new UpdateError("RATE_LIMITED", `GitHub Releases rate-limited the check (status ${response.status})`);
    }
    if (!response.ok) {
      throw new UpdateError("SOURCE_UNAVAILABLE", `GitHub Releases returned status ${response.status}`);
    }

    let body: GitHubReleaseResponse;
    try {
      body = (await response.json()) as GitHubReleaseResponse;
    } catch (cause) {
      throw new UpdateError("INVALID_RELEASE", "GitHub Releases returned a non-JSON body", { cause });
    }

    if (!body.tag_name) throw new UpdateError("INVALID_RELEASE", "GitHub release is missing tag_name");
    if (body.draft || body.prerelease) return null;

    if (!parseVersion(body.tag_name)) {
      throw new UpdateError("INVALID_VERSION", `Release tag "${body.tag_name}" is not a valid SemVer version`);
    }

    const assets: ReleaseAsset[] = (body.assets ?? [])
      .filter((asset): asset is { name: string; browser_download_url: string; size?: number } => !!asset.name && !!asset.browser_download_url)
      .map((asset) => ({ name: asset.name, downloadUrl: asset.browser_download_url, ...(asset.size !== undefined ? { sizeBytes: asset.size } : {}) }));

    return {
      version: normalizeVersion(body.tag_name), tag: body.tag_name,
      ...(body.body !== undefined ? { releaseNotes: body.body } : {}),
      ...(body.published_at !== undefined ? { publishedAt: body.published_at } : {}),
      assets,
    };
  }
}
