import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubReleaseSource } from "./github-release-source.js";
import { UpdateError } from "./errors.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("GitHubReleaseSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a normalized ReleaseInfo for a stable release", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({
      tag_name: "v0.2.0", draft: false, prerelease: false, body: "Notes", published_at: "2026-01-01T00:00:00Z",
      assets: [{ name: "gofluent-linux.tar.gz", browser_download_url: "https://example.test/gofluent-linux.tar.gz", size: 123 }],
    })));

    const source = new GitHubReleaseSource({ owner: "acme", repo: "gofluent", currentVersion: "0.1.0" });
    const release = await source.latestStable();

    expect(release).toEqual({
      version: "0.2.0", tag: "v0.2.0", releaseNotes: "Notes", publishedAt: "2026-01-01T00:00:00Z",
      assets: [{ name: "gofluent-linux.tar.gz", downloadUrl: "https://example.test/gofluent-linux.tar.gz", sizeBytes: 123 }],
    });
  });

  it("returns null for a draft release even if returned by the API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ tag_name: "v0.3.0", draft: true, prerelease: false })));
    const source = new GitHubReleaseSource({ owner: "acme", repo: "gofluent", currentVersion: "0.1.0" });
    expect(await source.latestStable()).toBeNull();
  });

  it("returns null for a prerelease", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ tag_name: "v0.3.0-beta.1", draft: false, prerelease: true })));
    const source = new GitHubReleaseSource({ owner: "acme", repo: "gofluent", currentVersion: "0.1.0" });
    expect(await source.latestStable()).toBeNull();
  });

  it("returns null when there are no releases yet (404)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    const source = new GitHubReleaseSource({ owner: "acme", repo: "gofluent", currentVersion: "0.1.0" });
    expect(await source.latestStable()).toBeNull();
  });

  it("normalizes rate limiting into UpdateError RATE_LIMITED", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    const source = new GitHubReleaseSource({ owner: "acme", repo: "gofluent", currentVersion: "0.1.0" });
    await expect(source.latestStable()).rejects.toMatchObject({ code: "RATE_LIMITED" } satisfies Partial<UpdateError>);
  });

  it("normalizes a network failure into UpdateError NETWORK", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const source = new GitHubReleaseSource({ owner: "acme", repo: "gofluent", currentVersion: "0.1.0" });
    await expect(source.latestStable()).rejects.toMatchObject({ code: "NETWORK" } satisfies Partial<UpdateError>);
  });

  it("normalizes an invalid tag into UpdateError INVALID_VERSION", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ tag_name: "not-semver", draft: false, prerelease: false })));
    const source = new GitHubReleaseSource({ owner: "acme", repo: "gofluent", currentVersion: "0.1.0" });
    await expect(source.latestStable()).rejects.toMatchObject({ code: "INVALID_VERSION" } satisfies Partial<UpdateError>);
  });

  it("sends the gofluent User-Agent header", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ tag_name: "v0.1.0", draft: false, prerelease: false }));
    vi.stubGlobal("fetch", fetchMock);
    const source = new GitHubReleaseSource({ owner: "acme", repo: "gofluent", currentVersion: "0.1.0" });
    await source.latestStable();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("gofluent/0.1.0");
  });
});
