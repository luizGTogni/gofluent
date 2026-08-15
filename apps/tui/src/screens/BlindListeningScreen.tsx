import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { completeListeningEncounter, generateBlindListeningContent } from "@gofluent/application";
import { synthesizeCachedAudio } from "@gofluent/application";
import { tokenizeLemmas } from "@gofluent/content-engine";
import type { StoryComprehensionQuestion } from "@gofluent/ai";
import type { Content } from "@gofluent/core";
import type { AppServices } from "../app/bootstrap.js";

export interface BlindListeningScreenProps {
  services: AppServices;
  topic: string;
  onDone: () => void;
  onError: (message: string) => void;
}

type Phase = "LOADING" | "LISTENING" | "COMPREHENSION" | "DEBRIEF";
type PlaybackStatus = "IDLE" | "PLAYING" | "DONE" | "UNAVAILABLE" | "ERROR";

const MAX_DEBRIEF_ENCOUNTERS = 5;

/**
 * "Increased exposure to listening without a transcript" (ROADMAP Phase 7).
 * Unlike `StoryScreen`'s optional "t" toggle, there is no transcript-reveal
 * control here at all until after the comprehension check — the transcript
 * only appears in the final DEBRIEF phase.
 */
export function BlindListeningScreen({ services, topic, onDone, onError }: BlindListeningScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("LOADING");
  const [content, setContent] = useState<Content | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("IDLE");
  const [playbackNote, setPlaybackNote] = useState<string | undefined>(undefined);
  const [replayToken, setReplayToken] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [debriefed, setDebriefed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      try {
        const profile = services.repos.profiles.getByUserId(services.userId);
        const knownLemmas = services.repos.lexemes.listAll("en")
          .filter((lexeme) => services.repos.lexemeStates.get(services.userId, lexeme.id) !== null)
          .map((lexeme) => lexeme.lemma);
        const generated = await generateBlindListeningContent(services.db, services.provider, services.model, {
          learnerId: services.userId, language: "en", topic, cefr: profile?.estimatedCefr ?? "A2", knownLemmas,
        });
        if (cancelled) return;
        setContent(generated);
        const available = services.config.speech.enabled && (await services.tts.isAvailable().catch(() => false));
        if (cancelled) return;
        setSpeechAvailable(available);
        setPhase(available ? "LISTENING" : "COMPREHENSION");
      } catch (cause) {
        if (!cancelled) onError(cause instanceof Error ? cause.message : String(cause));
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [topic]);

  useEffect(() => {
    if (phase !== "LISTENING" || !content || !speechAvailable) return;
    let cancelled = false;
    async function play(): Promise<void> {
      setPlaybackStatus("PLAYING");
      setPlaybackNote(undefined);
      try {
        const asset = await synthesizeCachedAudio(services.db, services.tts, {
          text: content!.bodyText ?? "", language: "en", voice: services.config.speech.defaultVoice, speed: services.config.speech.defaultSpeed,
          contentId: content!.id,
        });
        const availability = await services.audioPlayer.isAvailable();
        if (!availability.available) { if (!cancelled) { setPlaybackStatus("UNAVAILABLE"); setPlaybackNote(availability.reason); } return; }
        await services.audioPlayer.play({ filePath: asset.filePath });
        if (!cancelled) setPlaybackStatus("DONE");
      } catch (cause) {
        if (!cancelled) { setPlaybackStatus("ERROR"); setPlaybackNote(cause instanceof Error ? cause.message : String(cause)); }
      }
    }
    void play();
    return () => { cancelled = true; };
  }, [phase, speechAvailable, replayToken, content?.id]);

  const questions = (content?.metadata?.comprehensionQuestions as StoryComprehensionQuestion[] | undefined) ?? [];

  useEffect(() => {
    if (phase !== "DEBRIEF" || !content || debriefed) return;
    setDebriefed(true);
    try {
      const knownLemmas = new Set(
        services.repos.lexemes.listAll("en").filter((l) => services.repos.lexemeStates.get(services.userId, l.id) !== null).map((l) => l.lemma),
      );
      const tokens = new Set(tokenizeLemmas(content.bodyText ?? ""));
      let count = 0;
      for (const token of tokens) {
        if (count >= MAX_DEBRIEF_ENCOUNTERS) break;
        if (!knownLemmas.has(token)) continue;
        const lexeme = services.repos.lexemes.findByNormalizedForm("en", token)[0];
        if (!lexeme) continue;
        completeListeningEncounter(services.db, {
          learnerId: services.userId, lexemeId: lexeme.id, result: "SUCCESS", contentId: content.id,
          ...(lexeme.frequencyRank !== undefined ? { frequencyRank: lexeme.frequencyRank } : {}),
        });
        count += 1;
      }
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [phase, content, debriefed]);

  useInput((input, key) => {
    if (phase === "LISTENING") {
      if (input === "r") { setReplayToken((t) => t + 1); return; }
      if (key.return) setPhase("COMPREHENSION");
      return;
    }
    if (phase === "COMPREHENSION" && key.return) {
      if (questionIndex + 1 < questions.length) setQuestionIndex(questionIndex + 1);
      else setPhase("DEBRIEF");
      return;
    }
    if (phase === "DEBRIEF" && key.return) onDone();
  });

  if (phase === "LOADING") {
    return <Box flexDirection="column" padding={1}><Text bold>Preparing a listening piece about {topic}…</Text></Box>;
  }

  if (!content) return <Box padding={1}><Text>Something went wrong.</Text></Box>;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Blind Listening — {content.title}</Text>
      {phase === "LISTENING" && (
        <Box flexDirection="column">
          <Text dimColor>
            {playbackStatus === "PLAYING" && "Playing audio…"}
            {playbackStatus === "DONE" && "Playback finished."}
            {playbackStatus === "UNAVAILABLE" && `Audio unavailable (${playbackNote ?? "no player found"}).`}
            {playbackStatus === "ERROR" && `Audio error (${playbackNote ?? "unknown"}).`}
            {playbackStatus === "IDLE" && "Preparing audio…"}
          </Text>
          <Text dimColor>No transcript yet — listen as many times as you need.</Text>
          <Text dimColor>[r] replay  [Enter] I'm ready for the comprehension check</Text>
        </Box>
      )}
      {phase === "COMPREHENSION" && (
        <Box flexDirection="column">
          {!speechAvailable && <Text dimColor>(Audio unavailable — imagine you just listened to this.)</Text>}
          {questions.length > 0 && questions[questionIndex] ? (
            <>
              <Text>Q{questionIndex + 1}: {questions[questionIndex]?.question}</Text>
              {questions[questionIndex]?.options.map((option, i) => <Text key={option}>{i + 1}. {option}</Text>)}
            </>
          ) : (
            <Text>No comprehension questions for this piece.</Text>
          )}
          <Text dimColor>Press Enter to continue.</Text>
        </Box>
      )}
      {phase === "DEBRIEF" && (
        <Box flexDirection="column">
          <Text bold>Transcript</Text>
          <Text>{content.bodyText}</Text>
          <Text dimColor>Press Enter to continue.</Text>
        </Box>
      )}
    </Box>
  );
}
