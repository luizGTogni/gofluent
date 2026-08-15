import React, { useState } from "react";
import { Box, Text } from "ink";
import { PLACEMENT_QUESTIONS, runPlacementAssessment, type PlacementAnswer } from "@gofluent/application";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface PlacementScreenProps {
  services: AppServices;
  onDone: () => void;
  onError: (message: string) => void;
}

/** Adaptive placement assessment (PRD §9.6, ARCHITECTURE.md §45): a fixed, deterministic question set. */
export function PlacementScreen({ services, onDone, onError }: PlacementScreenProps): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const question = PLACEMENT_QUESTIONS[index];

  function answer(selectedOptionIndex: number): void {
    const next = [...answers, { questionId: question!.id, selectedOptionIndex }];
    if (index + 1 < PLACEMENT_QUESTIONS.length) {
      setAnswers(next);
      setIndex(index + 1);
      return;
    }
    try {
      const { score } = runPlacementAssessment(services.db, { userId: services.userId, answers: next });
      setAnswers(next);
      setIndex(PLACEMENT_QUESTIONS.length);
      // Estimated level is persisted; nothing else to show before handing off.
      void score;
      onDone();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (!question) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Scoring your placement…</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Placement — question {index + 1} of {PLACEMENT_QUESTIONS.length}</Text>
      <Text>{question.prompt}</Text>
      <SelectList
        key={question.id}
        items={question.options.map((label, optionIndex) => ({ label, value: optionIndex }))}
        onSelect={([value]) => answer(value ?? 0)}
      />
    </Box>
  );
}
