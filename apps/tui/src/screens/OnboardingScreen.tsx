import React from "react";
import { Box, Text, useInput } from "ink";

export interface OnboardingScreenProps {
  onDone: () => void;
}

/**
 * Full onboarding (native language, goals, interests, self-assessment;
 * PRD §9) is implemented in Phase 2. This is the Phase 0 placeholder that
 * proves the navigation transition and keyboard handling work end to end.
 */
export function OnboardingScreen({ onDone }: OnboardingScreenProps): React.JSX.Element {
  useInput((_input, key) => {
    if (key.return) onDone();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Onboarding</Text>
      <Text dimColor>Press Enter to continue.</Text>
    </Box>
  );
}
