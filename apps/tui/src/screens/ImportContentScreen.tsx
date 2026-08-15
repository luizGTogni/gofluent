import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { importContent, type ImportContentResult } from "@gofluent/application";
import type { ImportedLessonVocabularyNote, StoryComprehensionQuestion } from "@gofluent/ai";
import type { AppServices } from "../app/bootstrap.js";

export interface ImportContentScreenProps {
  services: AppServices;
  onDone: () => void;
  onError: (message: string) => void;
}

type Phase = "INPUT" | "PROCESSING" | "RESULT";

/**
 * Learn From Anything (ROADMAP Phase 5, PRD §64 future nav, ARCHITECTURE.md
 * §93): learner pastes/types arbitrary text, ends it with `/done`, and gets
 * back a lesson (comprehension questions + vocabulary notes) built from
 * mined high-value vocabulary — all persisted through the same
 * lexeme/encounter/review pipeline every other activity uses.
 */
export function ImportContentScreen({ services, onDone, onError }: ImportContentScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("INPUT");
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [result, setResult] = useState<ImportContentResult | null>(null);

  async function submit(rawText: string): Promise<void> {
    if (rawText.trim().length === 0) return;
    setPhase("PROCESSING");
    try {
      const imported = await importContent(services.db, services.provider, services.model, {
        learnerId: services.userId, language: "en", rawText,
      });
      setResult(imported);
      setPhase("RESULT");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useInput((input, key) => {
    if (phase === "INPUT") {
      if (key.escape) { onDone(); return; }
      if (key.return) {
        if (currentLine.trim() === "/done") { void submit(lines.join("\n")); return; }
        setLines((prev) => [...prev, currentLine]);
        setCurrentLine("");
        return;
      }
      if (key.backspace || key.delete) { setCurrentLine((t) => t.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta) setCurrentLine((t) => t + input);
      return;
    }
    if (phase === "RESULT" && key.return) onDone();
  });

  if (phase === "PROCESSING") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Learn From Anything</Text>
        <Text>Analyzing your text and building a lesson…</Text>
      </Box>
    );
  }

  if (phase === "RESULT" && result) {
    const questions = (result.content.metadata?.comprehensionQuestions as StoryComprehensionQuestion[] | undefined) ?? [];
    const notes = (result.content.metadata?.vocabularyNotes as ImportedLessonVocabularyNote[] | undefined) ?? [];
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Lesson ready</Text>
        <Text dimColor>
          Estimated difficulty: {Math.round((result.content.estimatedDifficulty ?? 0) * 100)}% unfamiliar vocabulary
          {" — "}{result.candidates.length} words mined for review.
        </Text>
        <Box flexDirection="column" marginTop={1}>
          <Text bold>New vocabulary</Text>
          {notes.map((note) => <Text key={note.lemma}>• {note.lemma}: {note.explanation}</Text>)}
        </Box>
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Comprehension questions ({questions.length})</Text>
          {questions.map((q, i) => <Text key={i}>{i + 1}. {q.question}</Text>)}
        </Box>
        <Text dimColor>These words were added to your review queue. Press Enter to continue.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Learn From Anything</Text>
      <Text>Paste or type any text you want to learn from. Type /done on its own line when finished (Esc to cancel).</Text>
      <Box flexDirection="column" marginTop={1}>
        {lines.map((line, i) => <Text key={i}>{line}</Text>)}
        <Text>&gt; {currentLine}</Text>
      </Box>
    </Box>
  );
}
