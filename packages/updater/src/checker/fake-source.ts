import type { ReleaseInfo, UpdateSource } from "./update-source.js";

/** Deterministic no-network `UpdateSource` (mirrors `@gofluent/ai`'s `FakeProvider`) for tests. */
export class FakeUpdateSource implements UpdateSource {
  constructor(private release: ReleaseInfo | null = null) {}

  setRelease(release: ReleaseInfo | null): void {
    this.release = release;
  }

  async latestStable(): Promise<ReleaseInfo | null> {
    return this.release;
  }
}
