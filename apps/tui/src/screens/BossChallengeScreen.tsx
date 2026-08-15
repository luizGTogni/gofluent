import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { evaluateBossChallengeAttempt, submitConversationTurn, type ConversationHistoryTurn } from "@gofluent/application";
import type { BossChallenge, World } from "@gofluent/core";
import type { AppServices } from "../app/bootstrap.js";

export interface BossChallengeScreenProps {
  services: AppServices;
  world: World;
  bossChallenge: BossChallenge;
  onDone: () => void;
  onError: (message: string) => void;
}

type Phase = "CHATTING" | "SENDING" | "EVALUATING" | "RESULT";

interface DisplayedTurn { speaker: "TUTOR" | "LEARNER"; text: string; }

const MIN_TURNS_BEFORE_END = 2;

/**
 * Boss Challenge (ROADMAP Phase 6, PRD §30): a scenario conversation
 * evaluated on task completion / comprehension / target-phrase usage /
 * ability to continue — not grammar. Turns reuse Speak Mode's
 * `submitConversationTurn` unchanged; only the end-of-challenge evaluation
 * is new (ARCHITECTURE.md §93-style reuse, ROADMAP Phase 6 depends on
 * Phase 4 for exactly this).
 */
export function BossChallengeScreen({ services, world, bossChallenge, onDone, onError }: BossChallengeScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("CHATTING");
  const [typed, setTyped] = useState("");
  const [turns, setTurns] = useState<DisplayedTurn[]>([]);
  const [evaluation, setEvaluation] = useState<Awaited<ReturnType<typeof evaluateBossChallengeAttempt>> | null>(null);

  const profile = useMemo(() => services.repos.profiles.getByUserId(services.userId), [services]);
  const cefr = profile?.estimatedCefr ?? "A2";
  const knownLemmasSample = useMemo(
    () => services.repos.lexemes.listAll("en").filter((l) => services.repos.lexemeStates.get(services.userId, l.id) !== null).map((l) => l.lemma).slice(0, 40),
    [services],
  );

  async function send(message: string): Promise<void> {
    setPhase("SENDING");
    const history: ConversationHistoryTurn[] = turns.map((t) => ({ speaker: t.speaker, text: t.text }));
    try {
      const result = await submitConversationTurn(services.db, services.provider, services.model, {
        learnerId: services.userId, language: "en", cefr, scenario: bossChallenge.scenario,
        knownLemmasSample, targetLemmas: bossChallenge.targetPhrases, history, learnerMessage: message,
      });
      setTurns((prev) => [...prev, { speaker: "LEARNER", text: message }, { speaker: "TUTOR", text: result.turn.tutorReply }]);
      setTyped("");
      setPhase("CHATTING");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function finish(): Promise<void> {
    setPhase("EVALUATING");
    try {
      const result = await evaluateBossChallengeAttempt(services.db, services.provider, services.model, {
        learnerId: services.userId, bossChallenge, transcript: turns,
      });
      setEvaluation(result);
      setPhase("RESULT");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useInput((input, key) => {
    if (phase === "RESULT" && key.return) { onDone(); return; }
    if (phase !== "CHATTING") return;
    if (key.escape) { onDone(); return; }
    if (key.return) {
      const message = typed.trim();
      if (message.length === 0) return;
      if (message === "/end") {
        if (turns.length < MIN_TURNS_BEFORE_END * 2) return;
        void finish();
        return;
      }
      void send(message);
      return;
    }
    if (key.backspace || key.delete) { setTyped((t) => t.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) setTyped((t) => t + input);
  });

  if (phase === "EVALUATING") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Boss Challenge — {bossChallenge.title}</Text>
        <Text>Evaluating your performance…</Text>
      </Box>
    );
  }

  if (phase === "RESULT" && evaluation) {
    const { attempt } = evaluation;
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Boss Challenge result — {bossChallenge.title}</Text>
        <Text>Outcome: {attempt.result}</Text>
        <Text>Task completion: {Math.round(attempt.taskCompletion * 100)}%</Text>
        <Text>Comprehension: {Math.round(attempt.comprehension * 100)}%</Text>
        <Text>Target phrase usage: {Math.round(attempt.targetPhraseUsage * 100)}%</Text>
        <Text>Ability to continue: {Math.round(attempt.abilityToContinue * 100)}%</Text>
        {attempt.feedback && <Text dimColor>{attempt.feedback}</Text>}
        <Text>{world.name} mastery is now {Math.round(evaluation.worldProgress.masteryScore * 100)}%.</Text>
        <Text dimColor>Press Enter to continue.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Boss Challenge — {bossChallenge.title}</Text>
      <Text dimColor>{bossChallenge.scenario}</Text>
      <Box flexDirection="column" marginTop={1}>
        {turns.slice(-6).map((turn, i) => (
          <Text key={i}>{turn.speaker === "TUTOR" ? "Tutor: " : "You: "}{turn.text}</Text>
        ))}
      </Box>
      {phase === "SENDING" ? (
        <Text dimColor>Tutor is thinking…</Text>
      ) : (
        <Box flexDirection="column">
          <Text>&gt; {typed}</Text>
          <Text dimColor>
            {turns.length < MIN_TURNS_BEFORE_END * 2
              ? `Type your reply and press Enter (at least ${MIN_TURNS_BEFORE_END} exchanges before /end).`
              : "Type your reply and press Enter. Type /end when you're ready to be evaluated."}
          </Text>
        </Box>
      )}
    </Box>
  );
}
