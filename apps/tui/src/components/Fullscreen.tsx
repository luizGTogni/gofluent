import React, { useEffect, useState } from "react";
import { Box, useStdout } from "ink";

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;

export interface FullscreenProps {
  children: React.ReactNode;
}

/** Makes every screen fill the terminal (and track resizes) instead of rendering inline like a plain CLI. */
export function Fullscreen({ children }: FullscreenProps): React.JSX.Element {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    columns: stdout.columns || DEFAULT_COLUMNS,
    rows: stdout.rows || DEFAULT_ROWS,
  });

  useEffect(() => {
    function onResize(): void {
      setSize({ columns: stdout.columns || DEFAULT_COLUMNS, rows: stdout.rows || DEFAULT_ROWS });
    }
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return (
    <Box width={size.columns} height={size.rows} flexDirection="column">
      {children}
    </Box>
  );
}
