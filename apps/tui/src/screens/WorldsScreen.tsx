import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { listWorldsWithProgress } from "@gofluent/application";
import type { BossChallenge, World } from "@gofluent/core";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface WorldsScreenProps {
  services: AppServices;
  onStartBossChallenge: (world: World, bossChallenge: BossChallenge) => void;
  onBack: () => void;
}

/** Learning Worlds hub (ROADMAP Phase 6, PRD §29): pick a world, see mastery, launch its Boss Challenge. */
export function WorldsScreen({ services, onStartBossChallenge, onBack }: WorldsScreenProps): React.JSX.Element {
  const worlds = useMemo(() => listWorldsWithProgress(services.db, services.userId, "en"), [services]);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);

  const selected = worlds.find((w) => w.world.id === selectedWorldId);
  const bossChallenge = selected ? services.repos.bossChallenges.listByWorld(selected.world.id)[0] : undefined;

  useInput((_input, key) => {
    if (key.escape) { if (selectedWorldId) setSelectedWorldId(null); else onBack(); }
  });

  if (selected) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>{selected.world.name}</Text>
        <Text dimColor>{selected.world.description ?? "Core vocabulary, stories, and conversation practice for this world."}</Text>
        <Text>Mastery: {Math.round((selected.progress?.masteryScore ?? 0) * 100)}%</Text>
        <Text>Boss Challenge: {selected.progress?.bossChallengeCompleted ? "Completed ✓" : "Not completed"}</Text>
        {bossChallenge && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>{bossChallenge.title}</Text>
            <Text>{bossChallenge.scenario}</Text>
            <SelectList
              items={[{ label: "Start Boss Challenge", value: "start" as const }, { label: "Back", value: "back" as const }]}
              onSelect={([value]) => {
                if (value === "start") onStartBossChallenge(selected.world, bossChallenge);
                else setSelectedWorldId(null);
              }}
            />
          </Box>
        )}
        <Text dimColor>Esc to go back.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Worlds</Text>
      <SelectList
        items={worlds.map((w) => ({
          label: `${w.world.name} — ${Math.round((w.progress?.masteryScore ?? 0) * 100)}% mastery${w.progress?.bossChallengeCompleted ? " · Boss ✓" : ""}`,
          value: w.world.id,
        }))}
        onSelect={([value]) => setSelectedWorldId(value ?? null)}
      />
      <Text dimColor>Esc to go back.</Text>
    </Box>
  );
}
