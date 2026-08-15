import React, { useEffect } from "react";
import { Box, Text } from "ink";

export interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>GoFluent</Text>
      <Text dimColor>Loading...</Text>
    </Box>
  );
}
