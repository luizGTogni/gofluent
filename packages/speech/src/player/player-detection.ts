/**
 * ARCHITECTURE.md §68 — avoid hard-depending on any single Linux audio stack
 * (PulseAudio/ffplay) without a fallback. Try a short list of common
 * cross-platform CLI players in order; the check is injectable so tests can
 * simulate "nothing installed" deterministically.
 */
export interface PlayerCandidate {
  command: string;
  buildArgs: (filePath: string) => string[];
}

export type CommandExistsChecker = (command: string) => Promise<boolean>;

function candidatesFor(platform: NodeJS.Platform): PlayerCandidate[] {
  if (platform === "darwin") {
    return [{ command: "afplay", buildArgs: (file) => [file] }];
  }
  if (platform === "win32") {
    return [
      {
        command: "powershell",
        buildArgs: (file) => [
          "-NoProfile",
          "-Command",
          `(New-Object Media.SoundPlayer '${file}').PlaySync();`,
        ],
      },
    ];
  }
  return [
    { command: "ffplay", buildArgs: (file) => ["-nodisp", "-autoexit", "-loglevel", "quiet", file] },
    { command: "mpg123", buildArgs: (file) => ["-q", file] },
    { command: "aplay", buildArgs: (file) => [file] },
    { command: "paplay", buildArgs: (file) => [file] },
  ];
}

export async function detectPlayer(
  commandExists: CommandExistsChecker,
  platform: NodeJS.Platform = process.platform,
): Promise<PlayerCandidate | null> {
  for (const candidate of candidatesFor(platform)) {
    if (await commandExists(candidate.command)) return candidate;
  }
  return null;
}
