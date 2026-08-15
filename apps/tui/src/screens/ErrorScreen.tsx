import React from "react";
import { Box, Text, useInput } from "ink";

export interface ErrorScreenProps {
  message: string | undefined;
  onAcknowledge: () => void;
}

/** Runtime validation surface (PRD §36) — unrecoverable failures land here instead of crashing the TUI. */
export function ErrorScreen({ message, onAcknowledge }: ErrorScreenProps): React.JSX.Element {
  useInput((_input, key) => { if (key.return) onAcknowledge(); });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="red">Something went wrong</Text>
      <Text>{message ?? "An unexpected error occurred."}</Text>
      <Text dimColor>Press Enter to return home.</Text>
    </Box>
  );
}
