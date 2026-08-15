import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { createLocalProfile, listLocalProfiles, setActiveUserId } from "@gofluent/application";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface ProfilesScreenProps {
  services: AppServices;
  onBack: () => void;
}

/**
 * Multiple local profiles (ROADMAP Phase 8, DATABASE.md §105). Switching
 * writes the new active profile immediately but does not hot-swap the
 * running session's `AppServices.userId` — the learner restarts GoFluent to
 * continue as the new profile, same honesty-over-fake-completeness call as
 * Speak Mode's unwired microphone capture (Phase 4).
 */
export function ProfilesScreen({ services, onBack }: ProfilesScreenProps): React.JSX.Element {
  const profiles = useMemo(() => listLocalProfiles(services.db), [services]);
  const [message, setMessage] = useState<string | null>(null);

  useInput((_input, key) => {
    if (message && key.return) { onBack(); return; }
    if (!message && key.escape) onBack();
  });

  if (message) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Profiles</Text>
        <Text>{message}</Text>
        <Text dimColor>Press Enter to continue.</Text>
      </Box>
    );
  }

  const items = [
    ...profiles.map((p) => ({
      label: `${p.userId === services.userId ? "● " : "  "}${p.profile ? `${p.profile.nativeLanguage} → ${p.profile.targetLanguage}` : "(new, not onboarded yet)"} — ${p.userId}`,
      value: p.userId,
    })),
    { label: "+ New profile", value: "__new__" },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Profiles</Text>
      <Text dimColor>● marks the active profile.</Text>
      <SelectList
        items={items}
        onSelect={([value]) => {
          if (value === "__new__") {
            createLocalProfile(services.db);
            setMessage("Created a new profile and made it active. Restart GoFluent to complete onboarding as this profile.");
            return;
          }
          if (value === services.userId) { setMessage("This profile is already active."); return; }
          if (value) {
            setActiveUserId(services.db, value);
            setMessage("Switched active profile. Restart GoFluent to continue as this profile.");
          }
        }}
      />
      <Text dimColor>Esc to go back.</Text>
    </Box>
  );
}
