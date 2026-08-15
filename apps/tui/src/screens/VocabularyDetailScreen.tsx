import React from "react";
import { Box, Text, useInput } from "ink";
import type { AppServices } from "../app/bootstrap.js";

export interface VocabularyDetailScreenProps {
  services: AppServices;
  lexemeId: string;
  onBack: () => void;
}

/** Vocabulary detail (PRD §64) — inspect a single item's learner state. Minimal in Phase 2. */
export function VocabularyDetailScreen({ services, lexemeId, onBack }: VocabularyDetailScreenProps): React.JSX.Element {
  useInput((_input, key) => { if (key.return || key.escape) onBack(); });

  const lexeme = services.repos.lexemes.get(lexemeId);
  const state = services.repos.lexemeStates.get(services.userId, lexemeId);

  if (!lexeme) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Unknown item.</Text>
        <Text dimColor>Press Enter to go back.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{lexeme.lemma}</Text>
      <Text dimColor>{lexeme.partOfSpeech ?? ""} {lexeme.cefr ? `· CEFR ${lexeme.cefr}` : ""}</Text>
      {state ? (
        <Box flexDirection="column">
          <Text>Reading recognition (estimate): {Math.round(state.readingRecognition * 100)}%</Text>
          <Text>Listening recognition (estimate): {Math.round(state.listeningRecognition * 100)}%</Text>
          <Text>Recall (estimate): {Math.round(state.recallScore * 100)}%</Text>
          <Text>Productive use (estimate): {Math.round(state.productiveScore * 100)}%</Text>
          <Text>Encounters: {state.encounters}</Text>
        </Box>
      ) : (
        <Text dimColor>Not encountered yet.</Text>
      )}
      <Text dimColor>Press Enter to go back.</Text>
    </Box>
  );
}
