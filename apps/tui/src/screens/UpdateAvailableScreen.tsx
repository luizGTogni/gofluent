import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { detectPackageManager, suggestedUpdateCommand, type UpdateInfo } from "@gofluent/updater";

export interface UpdateAvailableScreenProps {
  updateInfo: UpdateInfo;
  onNotNow: () => void;
}

/** UPDATER.md §13 Update Prompt — notification-first, never forces installation (§39). */
export function UpdateAvailableScreen({ updateInfo, onNotNow }: UpdateAvailableScreenProps): React.JSX.Element {
  useInput((_input, key) => { if (key.return || key.escape) onNotNow(); });

  const command = useMemo(() => suggestedUpdateCommand(detectPackageManager()), []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>GoFluent {updateInfo.latestVersion} is available</Text>
      <Text>You're using {updateInfo.currentVersion}.</Text>
      {updateInfo.releaseNotes && <Text dimColor>{updateInfo.releaseNotes}</Text>}
      <Box marginTop={1} flexDirection="column">
        <Text>Update when convenient:</Text>
        <Text>&gt; {command}</Text>
      </Box>
      <Text dimColor>Press Enter to continue (not now).</Text>
    </Box>
  );
}
