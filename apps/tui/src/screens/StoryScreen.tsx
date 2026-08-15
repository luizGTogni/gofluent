import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { completeReviewEncounter, generateStoryActivity, type DailyJourneyPlan, type TargetLexeme } from "@gofluent/application";
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

type Phase = "LOADING" | "READING" | "QUESTIONS" | "RETELL" | "DONE";

/**
 * Adaptive story flow (PRD §19): listen-first framing is present, but audio
 * playback itself is a Phase 3 concern — here it is a no-op label only.
 */
export function StoryScreen({ services, session, activity, onComplete, onError }: StoryScreenProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("LOADING");
  const [content, setContent] = useState<Content | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);

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
        setPhase("READING");
      } catch (cause) {
        if (!cancelled) onError(cause instanceof Error ? cause.message : String(cause));
      }
    }
    void run();
    return () => { cancelled = true; };
    // Intentionally runs once per mounted activity — story generation must not re-fire on unrelated re-renders.
  }, [activity.id]);

  const questions = (content?.metadata?.comprehensionQuestions as StoryComprehensionQuestion[] | undefined) ?? [];

  useInput((_input, key) => {
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
      <Text dimColor>Listen (audio arrives in Phase 3) — reading for now.</Text>
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
