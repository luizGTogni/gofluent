import React from "react";
import { Box, Text, useInput } from "ink";
import type { AppServices } from "../app/bootstrap.js";

export interface SettingsScreenProps {
  services: AppServices;
  onBack: () => void;
}

/** Minimal read-only settings view — full settings editing is out of Phase 2 scope. */
export function SettingsScreen({ services, onBack }: SettingsScreenProps): React.JSX.Element {
  useInput((_input, key) => { if (key.return || key.escape) onBack(); });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Settings</Text>
      <Text>AI provider: {services.provider.displayName}</Text>
      <Text>Model: {services.model || "(default)"}</Text>
      <Text>Daily minutes goal: {services.config.learning.dailyMinutes}</Text>
      <Text>New items per session: {services.config.learning.newItemsPerSession}</Text>
      <Text dimColor>Press Enter to go back.</Text>
    </Box>
  );
}
