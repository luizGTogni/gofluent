import React from "react";
import { Box, Text } from "ink";
import { completeSession, completeSessionActivity } from "@gofluent/application";
import type { LearningSession, SessionActivity } from "@gofluent/core";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface DailyJourneyScreenProps {
  services: AppServices;
  session: LearningSession;
  activities: SessionActivity[];
  onOpenActivity: (activity: SessionActivity) => void;
  onFinishSession: () => void;
  onError: (message: string) => void;
}

const STATUS_MARK: Record<string, string> = { PLANNED: "○", IN_PROGRESS: "◐", COMPLETED: "●", ABANDONED: "×", FAILED: "×" };

/** Session Planner overview (PRD §10.1) — the ordered activity checklist for today's journey. */
export function DailyJourneyScreen({ services, session, activities, onOpenActivity, onFinishSession, onError }: DailyJourneyScreenProps): React.JSX.Element {
  function handleSelect(activity: SessionActivity): void {
    if (activity.status === "COMPLETED") return;
    if (activity.activityType === "RECAP") {
      try {
        completeSessionActivity(services.db, activity);
        completeSession(services.db, session);
        onFinishSession();
      } catch (cause) {
        onError(cause instanceof Error ? cause.message : String(cause));
      }
      return;
    }
    onOpenActivity(activity);
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Today's Journey</Text>
      <Text dimColor>Select the next activity — Enter to open it.</Text>
      <SelectList items={activities.map((a) => ({ label: `${STATUS_MARK[a.status] ?? "○"} ${a.activityType} (${a.status})`, value: a }))} onSelect={([value]) => value && handleSelect(value)} />
    </Box>
  );
}
