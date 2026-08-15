import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { AppServices } from "../app/bootstrap.js";
import { ApiKeysScreen } from "./ApiKeysScreen.js";
import { ModelSettingsScreen } from "./ModelSettingsScreen.js";

export interface SetupScreenProps {
  services: AppServices;
  onDone: () => void;
  onSaved: () => void;
}

type Phase = "INTRO" | "KEY" | "MODEL";

/**
 * First-run gate (shown whenever no API key is configured, not only on the
 * very first launch): asks for the NVIDIA API key, then model + reasoning
 * effort, before onboarding — reusing the same Settings screens so there is
 * only one place that knows how to save these. Esc at any step skips ahead
 * (GoFluent still works offline via FakeProvider — NVIDIA_NIM.md §43).
 */
export function SetupScreen({ services, onDone, onSaved }: SetupScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("INTRO");

  if (phase === "KEY") {
    return <ApiKeysScreen services={services} onSaved={onSaved} onDone={() => setPhase("MODEL")} />;
  }
  if (phase === "MODEL") {
    return <ModelSettingsScreen services={services} onSaved={onSaved} onDone={onDone} />;
  }

  return <Intro onContinue={() => setPhase("KEY")} onSkip={onDone} />;
}

function Intro({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }): React.JSX.Element {
  useInput((_input, key) => {
    if (key.return) onContinue();
    else if (key.escape) onSkip();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>GoFluent Setup</Text>
      <Text>GoFluent uses NVIDIA NIM to generate lessons, stories, and conversation practice.</Text>
      <Text>Let&apos;s set up your API key, model, and reasoning effort before you start.</Text>
      <Box marginTop={1}>
        <Text dimColor>Enter to continue, Esc to skip (GoFluent still works offline without a key).</Text>
      </Box>
    </Box>
  );
}
