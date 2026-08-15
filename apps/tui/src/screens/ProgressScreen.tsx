import React from "react";
import { Box, Text, useInput } from "ink";
import { getGamificationSummary } from "@gofluent/application";
import type { AppServices } from "../app/bootstrap.js";

export interface ProgressScreenProps {
  services: AppServices;
  onBack: () => void;
}

/** Progress metrics are estimates, not ground truth — labeled as such (PRD §27). Gamification (PRD §28) is appended below the core estimates. */
export function ProgressScreen({ services, onBack }: ProgressScreenProps): React.JSX.Element {
  useInput((_input, key) => { if (key.return || key.escape) onBack(); });

  const profile = services.repos.profiles.getByUserId(services.userId);
  const dueCount = services.repos.reviews.listDue(services.userId, new Date().toISOString(), 1000).length;
  const encounterCount = services.repos.encounters.listRecent(services.userId, 1000).length;
  const gamification = getGamificationSummary(services.db, services.userId, "en");

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Progress (estimates)</Text>
      <Text>Estimated CEFR level: {profile?.estimatedCefr ?? "not yet assessed"}</Text>
      <Text>Estimated receptive vocabulary: {profile?.estimatedReceptiveVocabulary ?? "—"}</Text>
      <Text>Estimated productive vocabulary: {profile?.estimatedProductiveVocabulary ?? "—"}</Text>
      <Text>Items due for review: {dueCount}</Text>
      <Text>Encounters logged (last 1000): {encounterCount}</Text>
      <Text dimColor>All figures above are estimates derived from your interactions, not exact measurements.</Text>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Streaks &amp; personal bests</Text>
        <Text>Current streak: {gamification.currentStreak} day{gamification.currentStreak === 1 ? "" : "s"}</Text>
        <Text>Longest streak: {gamification.longestStreak} day{gamification.longestStreak === 1 ? "" : "s"}</Text>
        <Text>New words this week: {gamification.repertoireGrowth7d}</Text>
        <Text>Best day (encounters): {gamification.mostEncountersInADay}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>World mastery</Text>
        {gamification.worlds.map(({ world, progress }) => (
          <Text key={world.id}>
            {world.name}: {Math.round((progress?.masteryScore ?? 0) * 100)}%{progress?.bossChallengeCompleted ? " · Boss ✓" : ""}
          </Text>
        ))}
      </Box>

      <Text dimColor>Press Enter to go back.</Text>
    </Box>
  );
}
