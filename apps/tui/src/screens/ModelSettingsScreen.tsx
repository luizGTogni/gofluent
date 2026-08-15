import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { saveStoredConfig } from "@gofluent/config";
import type { Model } from "@gofluent/ai";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface ModelSettingsScreenProps {
  services: AppServices;
  onDone: () => void;
  /** Called right after a successful save so the caller can hot-reload the provider (see reloadAiConfig). */
  onSaved?: () => void;
}

type Phase = "LOADING" | "LIST" | "MODEL" | "EFFORT" | "SAVED";

const CUSTOM_MODEL = "__custom__";

const EFFORT_LEVELS = [
  { label: "None (model default)", value: "none" as const },
  { label: "Low", value: "low" as const },
  { label: "Medium", value: "medium" as const },
  { label: "High", value: "high" as const },
];

/**
 * Lets the learner pick the NIM model id (fetched from the provider's own
 * listModels(), same as NVIDIA_NIM.md §13's discovery endpoint — falls back
 * to free-text entry when the list can't be fetched, e.g. no key yet or
 * running against FakeProvider) and reasoning_effort (NVIDIA_NIM.md §18-19).
 * No capability check against the chosen model — an unsupported combo
 * surfaces as a provider error at generation time, like any invalid request.
 */
export function ModelSettingsScreen({ services, onDone, onSaved }: ModelSettingsScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("LOADING");
  const [model, setModel] = useState(services.config.ai.model);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);

  useEffect(() => {
    let cancelled = false;
    services.provider
      .listModels()
      .then((models) => {
        if (cancelled) return;
        setAvailableModels(models);
        setPhase(models.length > 0 ? "LIST" : "MODEL");
      })
      .catch(() => {
        if (!cancelled) setPhase("MODEL");
      });
    return () => {
      cancelled = true;
    };
  }, [services.provider]);

  useInput((input, key) => {
    if (phase !== "MODEL") return;
    if (key.escape) {
      if (availableModels.length > 0) setPhase("LIST");
      else onDone();
      return;
    }
    if (key.return) { setPhase("EFFORT"); return; }
    if (key.backspace || key.delete) { setModel((t) => t.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) setModel((t) => t + input);
  });

  if (phase === "LOADING") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Model &amp; Reasoning</Text>
        <Text dimColor>Fetching available models…</Text>
      </Box>
    );
  }

  if (phase === "SAVED") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Model &amp; Reasoning</Text>
        <Text>Saved.</Text>
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
              onSaved?.();
              setPhase("SAVED");
            }}
          />
        </Box>
      </Box>
    );
  }

  if (phase === "LIST") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Model &amp; Reasoning</Text>
        <Text dimColor>Models available to your NVIDIA NIM account (Esc to cancel).</Text>
        <Box marginTop={1}>
          <SelectList
            items={[
              ...availableModels.map((m) => ({ label: m.id, value: m.id })),
              { label: "Type a different model id…", value: CUSTOM_MODEL },
            ]}
            onSelect={([value]) => {
              if (value === CUSTOM_MODEL) { setPhase("MODEL"); return; }
              setModel(value ?? "");
              setPhase("EFFORT");
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
