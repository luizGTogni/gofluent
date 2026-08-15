/**
 * UPDATER.md §15-16 — conservative, advisory-only detection. This module
 * never spawns a package-manager command (§17 "do not implement automatic
 * npm self-update"); it only picks which instruction text to show.
 */
export type PackageManagerKind = "npm" | "pnpm" | "yarn" | "unknown";

/** UPDATER.md §15 — placeholder until the final package name is registered; do not hardcode a scoped name. */
const PACKAGE_NAME_PLACEHOLDER = "gofluent";

export function detectPackageManager(env: NodeJS.ProcessEnv = process.env): PackageManagerKind {
  const userAgent = env.npm_config_user_agent;
  if (userAgent?.startsWith("pnpm")) return "pnpm";
  if (userAgent?.startsWith("yarn")) return "yarn";
  if (userAgent?.startsWith("npm")) return "npm";

  const execPath = env.npm_execpath;
  if (execPath?.includes("pnpm")) return "pnpm";
  if (execPath?.includes("yarn")) return "yarn";
  if (execPath?.includes("npm")) return "npm";

  return "unknown";
}

/** Falls back to the officially supported npm instruction when detection is inconclusive (§15). */
export function suggestedUpdateCommand(kind: PackageManagerKind): string {
  switch (kind) {
    case "pnpm": return `pnpm add -g ${PACKAGE_NAME_PLACEHOLDER}@latest`;
    case "yarn": return `yarn global add ${PACKAGE_NAME_PLACEHOLDER}@latest`;
    case "npm":
    case "unknown":
      return `npm install --global ${PACKAGE_NAME_PLACEHOLDER}@latest`;
  }
}
