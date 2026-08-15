# UPDATER.md — GoFluent Update Strategy

> **Project:** GoFluent  
> **Status:** Initial technical specification  
> **Target:** v0.1.0+  
> **Scope:** Version discovery, update notification, package-manager flow, future standalone updater  
> **Versioning:** SemVer 2.0.0  
> **Language:** TypeScript  
> **Source adaptation:** Reuses safe-update principles from the GoCode updater specification, adapted to GoFluent's Node.js distribution strategy.

---

# 1. Purpose

This document defines how GoFluent discovers and presents new releases.

The GoCode updater architecture contains useful principles:

```text
safe
simple
non-blocking
recoverable
explicitly user-approved
```

Those principles are preserved.

However, GoFluent v0.1.0 is expected to begin as a Node/npm-style CLI distribution.

Therefore GoFluent must not blindly reuse a native executable self-replacement strategy intended for a Rust binary.

---

# 2. Core Rule

> **Update checking must never prevent the learner from opening GoFluent.**

A failed update check is not a learning-session failure.

The learner must be able to continue using the current version.

---

# 3. Source of Truth

Recommended release source:

```text
GitHub Releases
```

using SemVer-compatible tags:

```text
v0.1.0
v0.1.1
v0.2.0
```

The package registry version should match the GitHub release version.

---

# 4. Stable Channel

Default:

```text
stable
```

Ignore by default:

- draft releases;
- prereleases.

Future:

```text
beta
nightly
```

are outside the MVP.

---

# 5. SemVer Comparison

Normalize:

```text
v0.2.0
```

to:

```text
0.2.0
```

before comparison.

Examples:

```text
current 0.1.0
latest  0.2.0
→ update available
```

```text
current 0.2.0
latest  0.2.0
→ no update
```

```text
current 0.3.0
latest  0.2.0
→ no downgrade
```

Never automatically downgrade.

---

# 6. Architecture

Split responsibilities:

```text
UpdateChecker
UpdatePresenter
UpdateInstallerStrategy
```

For v0.1.0:

```text
UpdateChecker
+
TUI notification
+
PackageManagerInstructionStrategy
```

Future standalone binary releases may add:

```text
StandaloneUpdateInstaller
```

---

# 7. Why Notification-First for Node MVP

When GoFluent is installed using:

```text
npm
pnpm
```

the package manager owns the installation.

The application should not modify package-manager-owned files behind the package manager's back.

Therefore the safe MVP behavior is:

```text
new version found
      ↓
show update notification
      ↓
user chooses update instructions
      ↓
exit when convenient
      ↓
package manager upgrades GoFluent
```

---

# 8. Startup Timing

Preferred:

```text
TUI opens
      ↓
normal initialization continues
      ↓
update check begins asynchronously
```

Do not:

```text
check GitHub
      ↓
wait
      ↓
open TUI
```

---

# 9. Non-Blocking Failure

If GitHub is:

- unavailable;
- slow;
- rate limited;
- offline;

GoFluent continues normally.

Default:

```text
no modal
no fatal error
debug log only
```

---

# 10. Check Frequency

Initial behavior:

```text
check on startup
```

when enabled.

Configuration:

```json
{
  "updates": {
    "checkOnStartup": true
  }
}
```

A lightweight timestamp cache may avoid excessive requests later.

---

# 11. Update Available

Conceptual event:

```ts
export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  tag: string;
  releaseNotes?: string;
}
```

Application event:

```text
UpdateAvailable
```

The TUI decides when it is safe to show the notification.

---

# 12. Do Not Interrupt Learning

If the learner is:

```text
mid-story
mid-review
mid-conversation
in onboarding
```

defer the update notification.

Recommended:

```text
Home screen
or
end of Journey
```

is a better place.

---

# 13. Update Prompt

Example:

```text
GoFluent 0.2.0 is available

You're using 0.1.0.

[ View update ] [ Not now ]
```

Do not force installation.

---

# 14. Declining an Update

If:

```text
Not now
```

then:

- close notification;
- continue normally;
- do not block learning.

The same version may be shown again on a later startup.

Avoid aggressive repeated prompts within the same session.

---

# 15. MVP Installation Instruction

If installed through npm:

```text
npm install --global gofluent@latest
```

If the project later publishes under a scoped package, use that package name instead.

Do not hardcode a command until the final package name is registered.

If GoFluent can reliably detect the package manager, it may show a matching command.

Otherwise show the officially supported install method.

---

# 16. Package Manager Detection

Optional.

Possible evidence:

```text
npm_execpath
installation metadata
launcher path
```

Detection must be conservative.

Never run a package manager command automatically merely because detection appears likely.

---

# 17. Automatic npm Self-Update

Not required for v0.1.0.

Do not implement:

```text
spawn("npm install -g ...")
```

without an explicit product decision.

Reasons:

- permission behavior differs;
- package managers own lifecycle;
- Windows path locking can vary;
- installations may be managed by Volta/nvm/fnm/Corepack/other tools;
- automatic mutation can be surprising.

Notification-first is safer.

---

# 18. Manual Check

Recommended future command:

```text
gofluent update
```

or TUI setting:

```text
Check for updates
```

This can display current/latest version without installing automatically.

---

# 19. Update Source Contract

```ts
export interface UpdateSource {
  latestStable(
    signal?: AbortSignal,
  ): Promise<ReleaseInfo | null>;
}
```

Implementation:

```text
GitHubReleaseSource
```

This enables deterministic tests.

---

# 20. Release Info

```ts
export interface ReleaseInfo {
  version: string;
  tag: string;
  releaseNotes?: string;
  publishedAt?: string;
  assets: ReleaseAsset[];
}
```

---

# 21. Update Checker

```ts
export class UpdateChecker {
  constructor(
    private readonly source: UpdateSource,
    private readonly currentVersion: string,
  ) {}
}
```

Responsibilities:

- fetch stable release;
- normalize version;
- compare using SemVer;
- ignore drafts/prereleases;
- return update when newer.

---

# 22. Error Types

```ts
export type UpdateErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'INVALID_RELEASE'
  | 'INVALID_VERSION'
  | 'SOURCE_UNAVAILABLE';
```

Check failures are normally non-blocking.

---

# 23. Privacy

Update checks should not send:

- learner profile;
- vocabulary data;
- prompts;
- conversation history;
- NVIDIA API key;
- model selection.

Normal network metadata such as IP/User-Agent is unavoidable.

---

# 24. GitHub Authentication

Public stable release checks should not require the learner to configure a GitHub token.

If rate limits become problematic, improve caching before asking learners for developer credentials.

---

# 25. User Agent

Recommended:

```text
gofluent/<version>
```

---

# 26. Release Pipeline Contract

A release should produce at least:

```text
Git tag
GitHub Release
package registry publication
CHANGELOG
```

Versions must agree.

Example:

```text
package.json = 0.2.0
Git tag      = v0.2.0
GitHub       = v0.2.0
npm package  = 0.2.0
```

---

# 27. CI Release Flow

Conceptual:

```text
update package version
      ↓
update CHANGELOG
      ↓
typecheck
      ↓
tests
      ↓
Linux CI
      ↓
Windows CI
      ↓
build
      ↓
publish package
      ↓
GitHub Release
      ↓
tag vX.Y.Z
```

The exact release automation may differ.

---

# 28. Update Tests

Unit tests:

```text
version normalization
SemVer comparison
draft rejection
prerelease rejection
newer release detection
same-version behavior
downgrade rejection
invalid release handling
```

Integration tests:

```text
mock GitHub release source
network failure
rate limit
timeout
```

TUI tests:

```text
notification deferred during Journey
Not now
update screen
```

---

# 29. Definition of Done for v0.1.0 Update Checking

- [ ] Current version comes from package metadata/build metadata.
- [ ] Update check begins after TUI startup.
- [ ] Update failure does not block GoFluent.
- [ ] Latest stable GitHub release can be parsed.
- [ ] SemVer comparison is correct.
- [ ] Prereleases are ignored by default.
- [ ] No downgrade is offered.
- [ ] Update notification appears only for a newer stable release.
- [ ] Notification does not interrupt onboarding or active learning.
- [ ] Declining keeps the current session intact.
- [ ] Update instructions match the supported distribution.
- [ ] No learner data is sent during update checks.

---

# 30. Future Standalone Binary Distribution

If GoFluent later ships standalone executable bundles for:

```text
Windows
Linux
```

then a true self-updater may be introduced.

At that point reuse the stronger GoCode updater design:

```text
download
→ checksum verification
→ staging
→ install
→ rollback
→ restart
```

---

# 31. Future Standalone Update Architecture

```text
UpdateChecker
UpdateDownloader
ChecksumVerifier
PlatformInstaller
```

Windows may require a separate updater helper because replacing a running executable in place is unsafe.

Linux installation strategy will depend on distribution format.

Do not design one universal file-replacement algorithm without platform-specific handling.

---

# 32. Standalone Artifact Integrity

Future standalone downloads must be verified before installation.

Minimum:

```text
SHA-256
```

Possible future hardening:

```text
Sigstore/cosign
code signing
platform signatures
```

Checksum mismatch:

```text
abort
```

Current installation remains untouched.

---

# 33. Staging

Never install a partial download.

Pattern:

```text
download to temporary .part
      ↓
close/flush
      ↓
verify checksum
      ↓
rename/stage
      ↓
install
```

Never extract an archive directly over the live installation.

---

# 34. Archive Safety

Future ZIP/tar extraction must prevent path traversal.

Reject entries such as:

```text
../../malicious-file
```

Only expected paths may be extracted.

---

# 35. Standalone Rollback

Before replacing a standalone installation:

```text
backup old executable/files
      ↓
install new
      ↓
verify
```

If replacement fails:

```text
restore backup
```

A failed update must leave the old version usable whenever possible.

---

# 36. Windows Standalone Strategy

Future conceptual flow:

```text
gofluent.exe
      ↓
download + verify
      ↓
launch gofluent-updater.exe
      ↓
restore terminal
      ↓
main process exits
      ↓
updater waits for file release
      ↓
backup old executable
      ↓
replace
      ↓
restart
      ↓
cleanup
```

This is future work, not the Node/npm MVP path.

---

# 37. Linux Standalone Strategy

Linux behavior depends on package format.

Possible future forms:

```text
standalone archive
AppImage-like distribution
package repository
```

Do not bypass a system package manager if GoFluent was installed through one.

The installer strategy must know installation ownership.

---

# 38. Update Ownership

Key principle:

> **The component that owns installation should normally own updates.**

Examples:

```text
npm install
→ npm upgrades
```

```text
system package manager install
→ system package manager upgrades
```

```text
GoFluent standalone installer
→ GoFluent standalone updater may upgrade
```

---

# 39. Forced Updates

Do not implement forced updates in MVP.

The learner must be able to choose:

```text
Not now
```

Exceptions for future severe security compatibility events would require a separate product/security policy.

---

# 40. Silent Installation

Do not silently mutate the installation on startup.

Automatic checking is acceptable.

Automatic installation without explicit consent is not part of v0.1.0.

---

# 41. Database Compatibility

Application updates must respect `DATABASE.md`.

Before releasing a version with schema changes:

- migration tests pass;
- existing learner data migrates;
- no destructive reset is required.

The updater must never be treated as permission to discard local progress.

---

# 42. Session Flush

Before a future standalone installer restarts the process:

```text
flush learning session
flush database transaction
restore terminal mode
flush logs
```

Never intentionally restart while learner-state writes are partially committed.

---

# 43. Update Logging

Useful fields:

```text
current version
latest version
source
check duration
check result
install strategy
```

Future installer fields:

```text
asset name
checksum result
replacement stage
rollback result
```

Never log secrets or learner content.

---

# 44. Reference MVP Flow

```text
GoFluent 0.1.0 starts
      ↓
TUI opens
      ↓
background release check
      ↓
0.2.0 found
      ↓
learner finishes current activity
      ↓
update notification
      ↓
View update
      ↓
show supported upgrade command/instructions
      ↓
learner updates when convenient
```

---

# 45. Reference Failure Flow

```text
GoFluent starts
      ↓
GitHub unavailable
      ↓
update check fails
      ↓
debug log
      ↓
learning continues normally
```

---

# 46. Final Rule

The updater should make staying current easy without making GoFluent fragile.

> **A failed update mechanism must be less disruptive than simply staying on the current version.**
