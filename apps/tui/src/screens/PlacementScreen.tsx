import React from "react";
import { Box, Text, useInput } from "ink";

export interface PlacementScreenProps {
  onDone: () => void;
}

/**
 * Adaptive placement assessment (PRD §9.6, ARCHITECTURE.md §45) is
 * implemented in Phase 2. Phase 0 placeholder only.
 */
export function PlacementScreen({ onDone }: PlacementScreenProps): React.JSX.Element {
  useInput((_input, key) => {
    if (key.return) onDone();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Placement</Text>
      <Text dimColor>Press Enter to continue.</Text>
    </Box>
  );
}
