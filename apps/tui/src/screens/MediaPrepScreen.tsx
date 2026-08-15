import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { completeMediaPreparationItem, prepareMediaForLearner, type PrepareMediaForLearnerResult } from "@gofluent/application";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface MediaPrepScreenProps {
  services: AppServices;
  initialTitle?: string | undefined;
  onDone: () => void;
  onError: (message: string) => void;
}

type Phase = "TITLE" | "TRANSCRIPT" | "RESULT" | "DRILL" | "DONE";

/**
 * Media Preparation / "Prepare Me" (ROADMAP Phase 7, RESEARCH.md §32-33):
 * learner supplies a title + transcript excerpt for media they plan to
 * consume; the highest-value vocabulary is mined and drilled before they
 * go watch/listen/read the real thing. Entirely deterministic — no LLM call.
 */
export function MediaPrepScreen({ services, initialTitle, onDone, onError }: MediaPrepScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>(initialTitle ? "TRANSCRIPT" : "TITLE");
  const [title, setTitle] = useState(initialTitle ?? "");
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [result, setResult] = useState<PrepareMediaForLearnerResult | null>(null);
  const [drillIndex, setDrillIndex] = useState(0);

  function submitTranscript(): void {
    const transcriptExcerpt = lines.join("\n");
    if (transcriptExcerpt.trim().length === 0) return;
    try {
      const prepared = prepareMediaForLearner(services.db, {
        learnerId: services.userId, language: "en", title: title.trim() || "Untitled media", transcriptExcerpt,
      });
      setResult(prepared);
      setPhase("RESULT");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function drillStep(outcome: "SUCCESS" | "PARTIAL"): void {
    if (!result) return;
    const lexemeId = result.preparation.highValueLexemeIds[drillIndex];
    if (!lexemeId) { setPhase("DONE"); return; }
    try {
      const updated = completeMediaPreparationItem(services.db, { learnerId: services.userId, preparation: result.preparation, lexemeId, result: outcome });
      setResult({ ...result, preparation: updated });
      const next = drillIndex + 1;
      setDrillIndex(next);
      if (next >= result.candidates.length) setPhase("DONE");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useInput((input, key) => {
    if (phase === "TITLE") {
      if (key.escape) { onDone(); return; }
      if (key.return) { if (title.trim().length > 0) setPhase("TRANSCRIPT"); return; }
      if (key.backspace || key.delete) { setTitle((t) => t.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta) setTitle((t) => t + input);
      return;
    }
    if (phase === "TRANSCRIPT") {
      if (key.escape) { onDone(); return; }
      if (key.return) {
        if (currentLine.trim() === "/done") { submitTranscript(); return; }
        setLines((prev) => [...prev, currentLine]);
        setCurrentLine("");
        return;
      }
      if (key.backspace || key.delete) { setCurrentLine((t) => t.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta) setCurrentLine((t) => t + input);
      return;
    }
    if (phase === "DONE" && key.return) onDone();
  });

  if (phase === "TITLE") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Prepare Me</Text>
        <Text>What are you about to watch, listen to, or read?</Text>
        <Text>&gt; {title}</Text>
        <Text dimColor>Press Enter to continue (Esc to cancel).</Text>
      </Box>
    );
  }

  if (phase === "TRANSCRIPT") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Prepare Me — {title}</Text>
        <Text>Paste a permitted transcript/subtitle excerpt. Type /done on its own line when finished (Esc to cancel).</Text>
        <Box flexDirection="column" marginTop={1}>
          {lines.map((line, i) => <Text key={i}>{line}</Text>)}
          <Text>&gt; {currentLine}</Text>
        </Box>
      </Box>
    );
  }

  if (phase === "RESULT" && result) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>{result.preparation.title}</Text>
        <Text>Estimated comprehension: {Math.round(result.preparation.estimatedComprehension * 100)}%</Text>
        <Text>High-value items to learn first: {result.candidates.length}</Text>
        {result.candidates.map((c) => <Text key={c.lemma}>○ {c.lemma}</Text>)}
        <Box marginTop={1}>
          <SelectList
            items={[{ label: "Prepare me", value: "drill" as const }, { label: "Skip for now", value: "skip" as const }]}
            onSelect={([value]) => { if (value === "drill" && result.candidates.length > 0) setPhase("DRILL"); else onDone(); }}
          />
        </Box>
      </Box>
    );
  }

  if (phase === "DRILL" && result) {
    const candidate = result.candidates[drillIndex];
    if (!candidate) return <Box padding={1}><Text>Done.</Text></Box>;
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Prepare Me — item {drillIndex + 1} of {result.candidates.length}</Text>
        <Text>{candidate.lemma}</Text>
        <Text dimColor>Appears {candidate.occurrences} time{candidate.occurrences === 1 ? "" : "s"} in this excerpt.</Text>
        <SelectList
          items={[{ label: "Got it", value: "SUCCESS" as const }, { label: "Need more practice", value: "PARTIAL" as const }]}
          onSelect={([value]) => drillStep(value ?? "PARTIAL")}
        />
      </Box>
    );
  }

  if (phase === "DONE" && result) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>You're ready for {result.preparation.title}!</Text>
        <Text>Prepared {result.preparation.preparedCount} of {result.candidates.length} high-value items.</Text>
        <Text dimColor>Press Enter to continue.</Text>
      </Box>
    );
  }

  return <Box padding={1}><Text>Something went wrong.</Text></Box>;
}
