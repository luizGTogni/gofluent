import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { saveStoredConfig } from "@gofluent/config";
import type { AppServices } from "../app/bootstrap.js";

export interface ApiKeysScreenProps {
  services: AppServices;
  onDone: () => void;
}

type Phase = "EDIT" | "SAVED";

function maskKey(key: string | undefined): string {
  if (!key || key.trim().length === 0) return "(not set)";
  if (key.length <= 4) return "•".repeat(key.length);
  return `${"•".repeat(key.length - 4)}${key.slice(-4)}`;
}

/**
 * Saves the NVIDIA API key (used for both the NIM chat/generation provider
 * and the ASR provider — same credential, same env var — NVIDIA_NIM.md §43)
 * to the on-disk config file, so learners don't need to set an env var.
 * A saved key still loses to an env var at load time (ARCHITECTURE.md §59).
 */
export function ApiKeysScreen({ services, onDone }: ApiKeysScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("EDIT");
  const [typed, setTyped] = useState("");

  function save(value: string): void {
    const trimmed = value.trim();
    saveStoredConfig(services.configFilePath, { ai: { apiKey: trimmed }, asr: { apiKey: trimmed } });
    setPhase("SAVED");
  }

  useInput((input, key) => {
    if (phase === "SAVED") {
      if (key.return || key.escape) onDone();
      return;
    }
    if (key.escape) { onDone(); return; }
    if (key.return) { save(typed); return; }
    if (key.backspace || key.delete) { setTyped((t) => t.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) setTyped((t) => t + input);
  });

  if (phase === "SAVED") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>API Keys</Text>
        <Text>Saved. Restart GoFluent for the new key to take effect.</Text>
        <Text dimColor>Press Enter to continue.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>API Keys</Text>
      <Text dimColor>Used for NVIDIA NIM (AI content) and ASR (speech recognition) — one key covers both.</Text>
      <Text>Current: {maskKey(services.config.ai.apiKey)}</Text>
      <Box marginTop={1}>
        <Text>New key: {"•".repeat(typed.length)}</Text>
      </Box>
      <Text dimColor>Enter to save, Esc to cancel. Leave blank and press Enter to clear the saved key.</Text>
    </Box>
  );
}
