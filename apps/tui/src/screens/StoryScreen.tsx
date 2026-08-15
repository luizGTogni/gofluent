import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import {
  completeReviewEncounter, generateStoryActivity, LISTENING_MODES, speedForMode, splitIntoSentences,
  synthesizeCachedAudio, type DailyJourneyPlan, type ListeningMode, type TargetLexeme,
} from "@gofluent/application";
import type { StoryComprehensionQuestion } from "@gofluent/ai";
import type { Content, LearningSession, SessionActivity } from "@gofluent/core";
import type { AppServices } from "../app/bootstrap.js";

export interface StoryScreenProps {
  services: AppServices;
  session: LearningSession;
  activity: SessionActivity;
  onComplete: (activity: SessionActivity) => void;
  onError: (message: string) => void;
}

function planOf(session: LearningSession): DailyJourneyPlan | undefined {
  const plan = session.metadata?.plan;
  return plan as DailyJourneyPlan | undefined;
}

type Phase = "LOADING" | "LISTENING" | "READING" | "QUESTIONS" | "RETELL" | "DONE";
type PlaybackStatus = "IDLE" | "PLAYING" | "DONE" | "UNAVAILABLE" | "ERROR";

const MODE_LABEL: Record<ListeningMode, string> = {
  NORMAL: "Normal", SLOW: "Slow", SENTENCE_BY_SENTENCE: "Sentence-by-sentence",
};

/**
 * Adaptive story flow (PRD §19): "listen first, then reveal text". When
 * speech is unavailable/disabled the LISTENING phase is skipped entirely and
 * the transcript is shown immediately (NVIDIA_NIM.md §43 — audio failure
 * must never block reading).
 */
export function StoryScreen({ services, session, activity, onComplete, onError }: StoryScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("LOADING");
  const [content, setContent] = useState<Content | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [speechAvailable, setSpeechAvailable] = useState<boolean | null>(null);
  const [listeningMode, setListeningMode] = useState<ListeningMode>("NORMAL");
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("IDLE");
  const [playbackNote, setPlaybackNote] = useState<string | undefined>(undefined);
  const [replayToken, setReplayToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      try {
        const plan = planOf(session);
        const profile = services.repos.profiles.getByUserId(services.userId);
        const knownLemmas = services.repos.lexemes.listAll("en")
          .filter((lexeme) => services.repos.lexemeStates.get(services.userId, lexeme.id) !== null)
          .map((lexeme) => lexeme.lemma);
        const targetLexemes: TargetLexeme[] = [
          ...(plan?.newLexemeIds ?? []).map((id) => services.repos.lexemes.get(id)).filter((l): l is NonNullable<typeof l> => l !== null).map((l) => ({ id: l.id, lemma: l.lemma, role: "NEW" as const })),
          ...(plan?.reviewItemIds ?? []).slice(0, 3).map((id) => services.repos.lexemes.get(id)).filter((l): l is NonNullable<typeof l> => l !== null).map((l) => ({ id: l.id, lemma: l.lemma, role: "REVIEW" as const })),
        ];
        const result = await generateStoryActivity(services.db, services.provider, services.model, {
          learnerId: services.userId,
          activity,
          language: "en",
          topic: plan?.storyTopic ?? "everyday life",
          cefr: profile?.estimatedCefr ?? "A2",
          knownLemmas,
          targetLexemes,
        });
        if (cancelled) return;
        for (const target of targetLexemes) {
          const frequencyRank = services.repos.lexemes.get(target.id)?.frequencyRank;
          completeReviewEncounter(services.db, {
            learnerId: services.userId, lexemeId: target.id, modality: "READING", activity: "STORY",
            result: "SUCCESS", ...(frequencyRank !== undefined ? { frequencyRank } : {}),
            sessionId: session.id, contentId: result.content.id,
          });
        }
        setContent(result.content);

        const available = services.config.speech.enabled && (await services.tts.isAvailable().catch(() => false));
        if (cancelled) return;
        setSpeechAvailable(available);
        setPhase(available ? "LISTENING" : "READING");
        setTranscriptVisible(!available);
      } catch (cause) {
        if (!cancelled) onError(cause instanceof Error ? cause.message : String(cause));
      }
    }
    void run();
    return () => { cancelled = true; };
    // Intentionally runs once per mounted activity — story generation must not re-fire on unrelated re-renders.
  }, [activity.id]);

  const sentences = content?.bodyText ? splitIntoSentences(content.bodyText) : [];
  const currentText = listeningMode === "SENTENCE_BY_SENTENCE" ? (sentences[sentenceIndex] ?? "") : (content?.bodyText ?? "");

  useEffect(() => {
    if (phase !== "LISTENING" || !content || !speechAvailable) return;
    const contentId = content.id;
    let cancelled = false;
    async function playCurrent(): Promise<void> {
      setPlaybackStatus("PLAYING");
      setPlaybackNote(undefined);
      try {
        const speed = speedForMode(listeningMode, services.config.speech.defaultSpeed);
        const asset = await synthesizeCachedAudio(services.db, services.tts, {
          text: currentText, language: "en", voice: services.config.speech.defaultVoice, speed,
          contentId,
        });
        const availability = await services.audioPlayer.isAvailable();
        if (!availability.available) {
          if (!cancelled) { setPlaybackStatus("UNAVAILABLE"); setPlaybackNote(availability.reason); }
          return;
        }
        await services.audioPlayer.play({ filePath: asset.filePath });
        if (!cancelled) setPlaybackStatus("DONE");
      } catch (cause) {
        // NVIDIA_NIM.md §43 — TTS/player failure degrades to "no audio", never a thrown error into the TUI.
        if (!cancelled) { setPlaybackStatus("ERROR"); setPlaybackNote(cause instanceof Error ? cause.message : String(cause)); }
      }
    }
    void playCurrent();
    return () => { cancelled = true; };
  }, [phase, speechAvailable, listeningMode, sentenceIndex, replayToken, content?.id]);

  const questions = (content?.metadata?.comprehensionQuestions as StoryComprehensionQuestion[] | undefined) ?? [];

  useInput((input, key) => {
    if (phase === "LISTENING") {
      if (input === "m") {
        const currentIdx = LISTENING_MODES.indexOf(listeningMode);
        setListeningMode(LISTENING_MODES[(currentIdx + 1) % LISTENING_MODES.length] as ListeningMode);
        setSentenceIndex(0);
        return;
      }
      if (input === "t") { setTranscriptVisible((v) => !v); return; }
      if (input === "r") { setReplayToken((t) => t + 1); return; }
      if (key.return) {
        if (listeningMode === "SENTENCE_BY_SENTENCE" && sentenceIndex + 1 < sentences.length) {
          setSentenceIndex(sentenceIndex + 1);
          return;
        }
        setTranscriptVisible(true);
        setPhase("READING");
      }
      return;
    }
    if (!key.return) return;
    if (phase === "READING") setPhase(questions.length > 0 ? "QUESTIONS" : "RETELL");
    else if (phase === "QUESTIONS") {
      if (questionIndex + 1 < questions.length) setQuestionIndex(questionIndex + 1);
      else setPhase("RETELL");
    } else if (phase === "RETELL") {
      setPhase("DONE");
      onComplete(activity);
    }
  });

  if (phase === "LOADING") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Generating your story…</Text>
      </Box>
    );
  }

  if (!content) return <Box padding={1}><Text>Something went wrong.</Text></Box>;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{content.title}</Text>
      {phase === "LISTENING" && (
        <Box flexDirection="column">
          <Text dimColor>Listening mode: {MODE_LABEL[listeningMode]}{listeningMode === "SENTENCE_BY_SENTENCE" ? ` (${sentenceIndex + 1}/${sentences.length})` : ""}</Text>
          <Text dimColor>
            {playbackStatus === "PLAYING" && "Playing audio…"}
            {playbackStatus === "DONE" && "Playback finished."}
            {playbackStatus === "UNAVAILABLE" && `Audio unavailable (${playbackNote ?? "no player found"}) — reading still works.`}
            {playbackStatus === "ERROR" && `Audio error (${playbackNote ?? "unknown"}) — reading still works.`}
            {playbackStatus === "IDLE" && "Preparing audio…"}
          </Text>
          {transcriptVisible && <Text>{currentText}</Text>}
          <Text dimColor>[m] mode  [t] {transcriptVisible ? "hide" : "show"} transcript  [r] replay  [Enter] continue</Text>
        </Box>
      )}
      {phase === "READING" && (
        <Box flexDirection="column">
          <Text>{content.bodyText}</Text>
          <Text dimColor>Press Enter to continue.</Text>
        </Box>
      )}
      {phase === "QUESTIONS" && questions[questionIndex] && (
        <Box flexDirection="column">
          <Text>Q{questionIndex + 1}: {questions[questionIndex]?.question}</Text>
          {questions[questionIndex]?.options.map((option, i) => <Text key={option}>{i + 1}. {option}</Text>)}
          <Text dimColor>Press Enter to continue.</Text>
        </Box>
      )}
      {phase === "RETELL" && (
        <Box flexDirection="column">
          <Text>Now retell the story in your own words. (Speaking practice arrives in Phase 4.)</Text>
          <Text dimColor>Press Enter when you're done.</Text>
        </Box>
      )}
    </Box>
  );
}
