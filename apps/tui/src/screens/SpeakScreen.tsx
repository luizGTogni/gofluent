import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { submitConversationTurn, type ConversationHistoryTurn } from "@gofluent/application";
import type { AppServices } from "../app/bootstrap.js";

export interface SpeakScreenProps {
  services: AppServices;
  scenario: string;
  sessionId?: string | undefined;
  onDone: () => void;
  onError: (message: string) => void;
}

type Phase = "CHATTING" | "SENDING";

interface DisplayedTurn {
  speaker: "TUTOR" | "LEARNER";
  text: string;
  good?: string[] | undefined;
  corrections?: Array<{ original: string; corrected: string }> | undefined;
  newPhrase?: string | undefined;
}

/**
 * Speak Mode (PRD §23-25, ARCHITECTURE.md §52): typed conversation is
 * mandatory MVP; microphone conversation is optional and only turns on when
 * `services.asr` reports available (NVIDIA_NIM.md §43 — ASR unavailable
 * degrades to typed input, never blocks the conversation).
 */
export function SpeakScreen({ services, scenario, sessionId, onDone, onError }: SpeakScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("CHATTING");
  const [typed, setTyped] = useState("");
  const [turns, setTurns] = useState<DisplayedTurn[]>([]);
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    services.asr.isAvailable().then((available) => { if (!cancelled) setMicAvailable(available); }).catch(() => { if (!cancelled) setMicAvailable(false); });
    return () => { cancelled = true; };
  }, [services]);

  const profile = useMemo(() => services.repos.profiles.getByUserId(services.userId), [services]);
  const cefr = profile?.estimatedCefr ?? "A2";

  const knownLemmasSample = useMemo(
    () => services.repos.lexemes.listAll("en").filter((l) => services.repos.lexemeStates.get(services.userId, l.id) !== null).map((l) => l.lemma).slice(0, 40),
    [services],
  );
  const targetLemmas = useMemo(
    () => services.repos.reviews.listDue(services.userId, new Date().toISOString(), 5).map((r) => services.repos.lexemes.get(r.itemId)?.lemma).filter((l): l is string => l !== undefined),
    [services],
  );

  async function send(message: string): Promise<void> {
    setPhase("SENDING");
    const history: ConversationHistoryTurn[] = turns.map((t) => ({ speaker: t.speaker, text: t.text }));
    try {
      const result = await submitConversationTurn(services.db, services.provider, services.model, {
        learnerId: services.userId, language: "en", cefr, scenario,
        knownLemmasSample, targetLemmas, history, learnerMessage: message,
        sessionId,
      });
      setTurns((prev) => [
        ...prev,
        { speaker: "LEARNER", text: message },
        {
          speaker: "TUTOR", text: result.turn.tutorReply,
          good: result.turn.feedback.good, corrections: result.turn.feedback.corrections,
          newPhrase: result.turn.feedback.newPhrase,
        },
      ]);
      setTyped("");
      setPhase("CHATTING");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useInput((input, key) => {
    if (phase !== "CHATTING") return;
    if (key.escape) { onDone(); return; }
    if (key.return) {
      const message = typed.trim();
      if (message.length === 0) return;
      if (message === "/end") { onDone(); return; }
      void send(message);
      return;
    }
    if (key.backspace || key.delete) { setTyped((t) => t.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) setTyped((t) => t + input);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Speak Mode — {scenario}</Text>
      <Text dimColor>
        {micAvailable ? "Microphone conversation available (typed input still works)." : "Typed conversation only — microphone ASR is unavailable."}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {turns.slice(-6).map((turn, i) => (
          <Box key={i} flexDirection="column" marginBottom={turn.speaker === "TUTOR" ? 1 : 0}>
            <Text>{turn.speaker === "TUTOR" ? "Tutor: " : "You: "}{turn.text}</Text>
            {turn.speaker === "TUTOR" && turn.good && turn.good.length > 0 && (
              <Text color="green">Good: {turn.good.join("; ")}</Text>
            )}
            {turn.speaker === "TUTOR" && turn.corrections && turn.corrections.length > 0 && (
              <Text color="yellow">Try this: {turn.corrections.map((c) => `"${c.original}" → "${c.corrected}"`).join("; ")}</Text>
            )}
            {turn.speaker === "TUTOR" && turn.newPhrase && <Text color="cyan">New phrase: "{turn.newPhrase}"</Text>}
          </Box>
        ))}
      </Box>
      {phase === "SENDING" ? (
        <Text dimColor>Tutor is thinking…</Text>
      ) : (
        <Box flexDirection="column">
          <Text>&gt; {typed}</Text>
          <Text dimColor>Type your reply and press Enter. Type /end (or Esc) to finish.</Text>
        </Box>
      )}
    </Box>
  );
}
