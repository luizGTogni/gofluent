/** UPDATER.md §20 Release Info. */
export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
  sizeBytes?: number;
}

export interface ReleaseInfo {
  version: string;
  tag: string;
  releaseNotes?: string;
  publishedAt?: string;
  assets: ReleaseAsset[];
}

/** UPDATER.md §19 Update Source Contract — enables deterministic tests via a fake implementation. */
export interface UpdateSource {
  latestStable(signal?: AbortSignal): Promise<ReleaseInfo | null>;
}
