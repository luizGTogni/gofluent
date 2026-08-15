import React from "react";
import { Box, Text } from "ink";

/**
 * Home hub branches into Journey/Review/Story/Progress/Settings starting
 * Phase 2 (ARCHITECTURE.md §21). Phase 0 placeholder only.
 */
export function HomeScreen(): React.JSX.Element {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Home</Text>
      <Text dimColor>Daily Journey, Review, Progress, and Settings land in later phases.</Text>
    </Box>
  );
}
