import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { completeReviewEncounter } from "@gofluent/application";
import type { Lexeme } from "@gofluent/core";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface ReviewScreenProps {
  services: AppServices;
  /** Specific items to review (from a Daily Journey plan) — omitted for a standalone "quick review". */
  reviewLexemeIds?: string[] | undefined;
  sessionId?: string | undefined;
  onComplete: () => void;
  onError: (message: string) => void;
}

/**
 * Contextual review (PRD §16): alternates typed active recall (spelling)
 * with a choose-the-natural-phrase multiple-choice item built from the
 * other lexemes in the same batch as distractors.
 */
export function ReviewScreen({ services, reviewLexemeIds, sessionId, onComplete, onError }: ReviewScreenProps): React.JSX.Element {
  const items = useMemo<Lexeme[]>(() => {
    const ids = reviewLexemeIds ?? services.repos.reviews.listDue(services.userId, new Date().toISOString(), 10).map((r) => r.itemId);
    return ids.map((id) => services.repos.lexemes.get(id)).filter((l): l is Lexeme => l !== null);
  }, [services, reviewLexemeIds]);

  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const current = items[index];
  const isTypedMode = index % 2 === 0;

  function record(lexeme: Lexeme, success: boolean): void {
    try {
      completeReviewEncounter(services.db, {
        learnerId: services.userId, lexemeId: lexeme.id,
        modality: isTypedMode ? "RECALL" : "READING", activity: "REVIEW",
        result: success ? "SUCCESS" : "FAIL",
        ...(lexeme.frequencyRank !== undefined ? { frequencyRank: lexeme.frequencyRank } : {}),
        ...(sessionId !== undefined ? { sessionId } : {}),
      });
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
      return;
    }
    setFeedback(success ? "Correct!" : `Not quite — it was "${lexeme.lemma}".`);
    setTyped("");
    setTimeout(() => {
      setFeedback(null);
      setIndex((i) => i + 1);
    }, 400);
  }

  useInput((input, key) => {
    if (!current || !isTypedMode || feedback) return;
    if (key.return) {
      record(current, typed.trim().toLowerCase() === current.lemma.toLowerCase());
    } else if (key.backspace || key.delete) {
      setTyped((t) => t.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setTyped((t) => t + input);
    }
  });

  if (index >= items.length || !current) {
    if (items.length > 0 && !feedback) onComplete();
    return (
      <Box flexDirection="column" padding={1}>
        <Text>{items.length === 0 ? "Nothing due for review right now." : "Review complete."}</Text>
        <SelectList items={[{ label: "Continue", value: "continue" }]} onSelect={onComplete} />
      </Box>
    );
  }

  const distractors = items.filter((_, i) => i !== index).map((l) => l.lemma).slice(0, 2);
  const options = [current.lemma, ...distractors].sort(() => 0.5 - ((current.id.charCodeAt(0) % 10) / 10));

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Review — item {index + 1} of {items.length}</Text>
      {feedback && <Text>{feedback}</Text>}
      {!feedback && isTypedMode && (
        <Box flexDirection="column">
          <Text>Type this word to confirm you recall it: {current.lemma}</Text>
          <Text>&gt; {typed}</Text>
        </Box>
      )}
      {!feedback && !isTypedMode && (
        <Box flexDirection="column">
          <Text>Which word completes: "I really need to ___ this out."</Text>
          <SelectList items={options.map((label) => ({ label, value: label }))} onSelect={([value]) => record(current, value === current.lemma)} />
        </Box>
      )}
    </Box>
  );
}
