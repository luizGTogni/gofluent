import React from "react";
import { Box, Text, useInput } from "ink";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface SettingsScreenProps {
  services: AppServices;
  onOpenProfiles: () => void;
  onBack: () => void;
}

/** Minimal settings view — full settings editing is out of Phase 2 scope. */
export function SettingsScreen({ services, onOpenProfiles, onBack }: SettingsScreenProps): React.JSX.Element {
  useInput((_input, key) => { if (key.escape) onBack(); });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Settings</Text>
      <Text>AI provider: {services.provider.displayName}</Text>
      <Text>Model: {services.model || "(default)"}</Text>
      <Text>Daily minutes goal: {services.config.learning.dailyMinutes}</Text>
      <Text>New items per session: {services.config.learning.newItemsPerSession}</Text>
      <Text>Device ID: {services.deviceId}</Text>
      <Box marginTop={1}>
        <SelectList
          items={[{ label: "Profiles", value: "profiles" as const }, { label: "Back", value: "back" as const }]}
          onSelect={([value]) => { if (value === "profiles") onOpenProfiles(); else onBack(); }}
        />
      </Box>
    </Box>
  );
}
