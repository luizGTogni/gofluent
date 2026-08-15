import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { findInProgressSession, listSessionActivities } from "@gofluent/application";
import type { LearningSession, SessionActivity } from "@gofluent/core";
import type { AppServices } from "../app/bootstrap.js";
import { startNewDailyJourneySession } from "../app/journey.js";
import { SelectList } from "../components/SelectList.js";

export interface HomeScreenProps {
  services: AppServices;
  onOpenJourney: (session: LearningSession, activities: SessionActivity[]) => void;
  onQuickReview: () => void;
  onOpenSpeak: () => void;
  onOpenImport: () => void;
  onOpenWorlds: () => void;
  onOpenProgress: () => void;
  onOpenSettings: () => void;
  onError: (message: string) => void;
}

/** Home hub branches into Journey/Review/Speak/Import/Worlds/Progress/Settings (ARCHITECTURE.md §21, PRD §64). */
export function HomeScreen({ services, onOpenJourney, onQuickReview, onOpenSpeak, onOpenImport, onOpenWorlds, onOpenProgress, onOpenSettings, onError }: HomeScreenProps): React.JSX.Element {
  const inProgress = useMemo(() => findInProgressSession(services.db, services.userId), [services]);
  const dueCount = useMemo(() => services.repos.reviews.listDue(services.userId, new Date().toISOString(), 200).length, [services]);

  function startOrResume(): void {
    try {
      if (inProgress) {
        onOpenJourney(inProgress, listSessionActivities(services.db, inProgress.id));
        return;
      }
      const { session, activities } = startNewDailyJourneySession(services);
      onOpenJourney(session, activities);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const items = [
    { label: inProgress ? "Continue today's journey" : "Start today's journey", value: "journey" as const },
    { label: `Quick review (${dueCount} due)`, value: "review" as const },
    { label: "Speak Mode", value: "speak" as const },
    { label: "Learn From Anything", value: "import" as const },
    { label: "Worlds", value: "worlds" as const },
    { label: "Progress", value: "progress" as const },
    { label: "Settings", value: "settings" as const },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Home</Text>
      <SelectList
        items={items}
        onSelect={([value]) => {
          if (value === "journey") startOrResume();
          else if (value === "review") onQuickReview();
          else if (value === "speak") onOpenSpeak();
          else if (value === "import") onOpenImport();
          else if (value === "worlds") onOpenWorlds();
          else if (value === "progress") onOpenProgress();
          else if (value === "settings") onOpenSettings();
        }}
      />
    </Box>
  );
}
