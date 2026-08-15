import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { saveStoredConfig } from "@gofluent/config";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface ModelSettingsScreenProps {
  services: AppServices;
  onDone: () => void;
}

type Phase = "MODEL" | "EFFORT" | "SAVED";

const EFFORT_LEVELS = [
  { label: "None (model default)", value: "none" as const },
  { label: "Low", value: "low" as const },
  { label: "Medium", value: "medium" as const },
  { label: "High", value: "high" as const },
];

/**
 * Lets the learner override the NIM model id and reasoning_effort
 * (NVIDIA_NIM.md §18-19) without an env var. No capability check against
 * the chosen model — an unsupported model/effort combo surfaces as a
 * provider error at generation time, same as any other invalid request.
 */
export function ModelSettingsScreen({ services, onDone }: ModelSettingsScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("MODEL");
  const [model, setModel] = useState(services.config.ai.model);

  useInput((input, key) => {
    if (phase !== "MODEL") return;
    if (key.escape) { onDone(); return; }
    if (key.return) { setPhase("EFFORT"); return; }
    if (key.backspace || key.delete) { setModel((t) => t.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) setModel((t) => t + input);
  });

  if (phase === "SAVED") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Model &amp; Reasoning</Text>
        <Text>Saved. Restart GoFluent for the new settings to take effect.</Text>
        <Text dimColor>Press Enter to continue.</Text>
        <SelectListDismiss onDone={onDone} />
      </Box>
    );
  }

  if (phase === "EFFORT") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Model &amp; Reasoning</Text>
        <Text>Model: {model.trim() || "(default)"}</Text>
        <Text dimColor>Reasoning effort — sent as reasoning_effort on every request (Esc to go back).</Text>
        <Box marginTop={1}>
          <SelectList
            items={EFFORT_LEVELS}
            onSelect={([value]) => {
              saveStoredConfig(services.configFilePath, { ai: { model: model.trim(), reasoningEffort: value } });
              setPhase("SAVED");
            }}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Model &amp; Reasoning</Text>
      <Text dimColor>NVIDIA NIM model id. Enter to continue, Esc to cancel.</Text>
      <Box marginTop={1}>
        <Text>Model: {model}</Text>
      </Box>
    </Box>
  );
}

/** EFFORT's SelectList already reacts to Enter/arrows; SAVED just needs a bare Enter/Esc listener. */
function SelectListDismiss({ onDone }: { onDone: () => void }): null {
  useInput((_input, key) => { if (key.return || key.escape) onDone(); });
  return null;
}
