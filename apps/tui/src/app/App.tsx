import React, { useMemo, useState } from "react";
import { useReducer } from "react";
import type { BossChallenge, LearningSession, SessionActivity, World } from "@gofluent/core";
import { initialNavigationState, navigationReducer } from "../navigation/state.js";
import { SplashScreen } from "../screens/SplashScreen.js";
import { OnboardingScreen } from "../screens/OnboardingScreen.js";
import { PlacementScreen } from "../screens/PlacementScreen.js";
import { HomeScreen } from "../screens/HomeScreen.js";
import { DailyJourneyScreen } from "../screens/DailyJourneyScreen.js";
import { StoryScreen } from "../screens/StoryScreen.js";
import { ReviewScreen } from "../screens/ReviewScreen.js";
import { SpeakScreen } from "../screens/SpeakScreen.js";
import { ImportContentScreen } from "../screens/ImportContentScreen.js";
import { WorldsScreen } from "../screens/WorldsScreen.js";
import { BossChallengeScreen } from "../screens/BossChallengeScreen.js";
import { ImmersionFeedScreen } from "../screens/ImmersionFeedScreen.js";
import { MediaPrepScreen } from "../screens/MediaPrepScreen.js";
import { BlindListeningScreen } from "../screens/BlindListeningScreen.js";
import { ProgressScreen } from "../screens/ProgressScreen.js";
import { SettingsScreen } from "../screens/SettingsScreen.js";
import { ErrorScreen } from "../screens/ErrorScreen.js";
import { createInMemoryServices, type AppServices } from "./bootstrap.js";

export interface AppProps {
  services?: AppServices;
}

interface JourneyState {
  session: LearningSession;
  activities: SessionActivity[];
  activeActivityId?: string | undefined;
}

export function App({ services }: AppProps = {}): React.JSX.Element {
  const resolvedServices = useMemo(() => services ?? createInMemoryServices(), [services]);
  const [state, dispatch] = useReducer(navigationReducer, initialNavigationState);
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<{ world: World; bossChallenge: BossChallenge } | null>(null);
  const [speakScenario, setSpeakScenario] = useState("Everyday conversation practice");
  const [blindListeningTopic, setBlindListeningTopic] = useState<string | null>(null);
  const [mediaPrepTitle, setMediaPrepTitle] = useState<string | undefined>(undefined);

  function onError(message: string): void {
    dispatch({ type: "ERROR_OCCURRED", message });
  }

  const activeActivity = journey?.activities.find((a) => a.id === journey.activeActivityId);
  React.useEffect(() => {
    const needsJourney = state.route === "JOURNEY" || state.route === "STORY" || state.route === "REVIEW";
    if (needsJourney && !journey && state.route !== "REVIEW") { dispatch({ type: "GO_HOME" }); return; }
    if (state.route === "STORY" && journey && !activeActivity) dispatch({ type: "GO_HOME" });
    if (state.route === "BOSS_CHALLENGE" && !activeChallenge) dispatch({ type: "NAVIGATE", route: "WORLDS" });
    if (state.route === "BLIND_LISTENING" && !blindListeningTopic) dispatch({ type: "NAVIGATE", route: "IMMERSION" });
    if (state.route === "VOCAB_DETAIL") dispatch({ type: "GO_HOME" });
  }, [state.route, journey, activeActivity, activeChallenge, blindListeningTopic]);

  switch (state.route) {
    case "SPLASH":
      return <SplashScreen onDone={() => dispatch({ type: "SPLASH_DONE" })} />;

    case "ONBOARDING":
      return <OnboardingScreen services={resolvedServices} onDone={() => dispatch({ type: "ONBOARDING_DONE" })} onError={onError} />;

    case "PLACEMENT":
      return <PlacementScreen services={resolvedServices} onDone={() => dispatch({ type: "PLACEMENT_DONE" })} onError={onError} />;

    case "HOME":
      return (
        <HomeScreen
          services={resolvedServices}
          onOpenJourney={(session, activities) => {
            setJourney({ session, activities });
            dispatch({ type: "NAVIGATE", route: "JOURNEY" });
          }}
          onQuickReview={() => dispatch({ type: "NAVIGATE", route: "REVIEW" })}
          onOpenSpeak={() => dispatch({ type: "NAVIGATE", route: "SPEAK" })}
          onOpenImport={() => dispatch({ type: "NAVIGATE", route: "IMPORT" })}
          onOpenWorlds={() => dispatch({ type: "NAVIGATE", route: "WORLDS" })}
          onOpenImmersion={() => dispatch({ type: "NAVIGATE", route: "IMMERSION" })}
          onOpenProgress={() => dispatch({ type: "NAVIGATE", route: "PROGRESS" })}
          onOpenSettings={() => dispatch({ type: "NAVIGATE", route: "SETTINGS" })}
          onError={onError}
        />
      );

    case "JOURNEY": {
      if (!journey) return <SplashScreen onDone={() => {}} />;
      return (
        <DailyJourneyScreen
          services={resolvedServices}
          session={journey.session}
          activities={journey.activities}
          onOpenActivity={(activity) => {
            setJourney({ ...journey, activeActivityId: activity.id });
            dispatch({ type: "NAVIGATE", route: activity.activityType === "STORY" ? "STORY" : "REVIEW" });
          }}
          onFinishSession={() => {
            setJourney(null);
            dispatch({ type: "GO_HOME" });
          }}
          onError={onError}
        />
      );
    }

    case "STORY": {
      if (!journey || !activeActivity) return <SplashScreen onDone={() => {}} />;
      return (
        <StoryScreen
          services={resolvedServices}
          session={journey.session}
          activity={activeActivity}
          onComplete={(completedActivity) => {
            const updatedActivities = journey.activities.map((a) => (a.id === completedActivity.id ? { ...a, status: "COMPLETED" as const } : a));
            setJourney({ ...journey, activities: updatedActivities });
            dispatch({ type: "NAVIGATE", route: "JOURNEY" });
          }}
          onError={onError}
        />
      );
    }

    case "REVIEW": {
      const plan = journey?.session.metadata?.plan as { reviewItemIds?: string[] } | undefined;
      return (
        <ReviewScreen
          services={resolvedServices}
          reviewLexemeIds={activeActivity ? plan?.reviewItemIds : undefined}
          sessionId={journey?.session.id}
          onComplete={() => {
            if (journey && activeActivity) {
              const updatedActivities = journey.activities.map((a) => (a.id === activeActivity.id ? { ...a, status: "COMPLETED" as const } : a));
              setJourney({ ...journey, activities: updatedActivities });
              dispatch({ type: "NAVIGATE", route: "JOURNEY" });
            } else {
              dispatch({ type: "GO_HOME" });
            }
          }}
          onError={onError}
        />
      );
    }

    case "SPEAK":
      return (
        <SpeakScreen
          services={resolvedServices}
          scenario={speakScenario}
          sessionId={journey?.session.id}
          onDone={() => {
            setSpeakScenario("Everyday conversation practice");
            dispatch({ type: "GO_HOME" });
          }}
          onError={onError}
        />
      );

    case "IMPORT":
      return <ImportContentScreen services={resolvedServices} onDone={() => dispatch({ type: "GO_HOME" })} onError={onError} />;

    case "IMMERSION":
      return (
        <ImmersionFeedScreen
          services={resolvedServices}
          onOpenConversation={(topic) => {
            setSpeakScenario(topic);
            dispatch({ type: "NAVIGATE", route: "SPEAK" });
          }}
          onOpenBlindListening={(topic) => {
            setBlindListeningTopic(topic);
            dispatch({ type: "NAVIGATE", route: "BLIND_LISTENING" });
          }}
          onOpenMediaPrep={(title) => {
            setMediaPrepTitle(title);
            dispatch({ type: "NAVIGATE", route: "MEDIA_PREP" });
          }}
          onBack={() => dispatch({ type: "GO_HOME" })}
        />
      );

    case "BLIND_LISTENING": {
      if (!blindListeningTopic) return <SplashScreen onDone={() => {}} />;
      return (
        <BlindListeningScreen
          services={resolvedServices}
          topic={blindListeningTopic}
          onDone={() => {
            setBlindListeningTopic(null);
            dispatch({ type: "NAVIGATE", route: "IMMERSION" });
          }}
          onError={onError}
        />
      );
    }

    case "MEDIA_PREP":
      return (
        <MediaPrepScreen
          services={resolvedServices}
          initialTitle={mediaPrepTitle}
          onDone={() => {
            setMediaPrepTitle(undefined);
            dispatch({ type: "GO_HOME" });
          }}
          onError={onError}
        />
      );

    case "WORLDS":
      return (
        <WorldsScreen
          services={resolvedServices}
          onStartBossChallenge={(world, bossChallenge) => {
            setActiveChallenge({ world, bossChallenge });
            dispatch({ type: "NAVIGATE", route: "BOSS_CHALLENGE" });
          }}
          onBack={() => dispatch({ type: "GO_HOME" })}
        />
      );

    case "BOSS_CHALLENGE": {
      if (!activeChallenge) return <SplashScreen onDone={() => {}} />;
      return (
        <BossChallengeScreen
          services={resolvedServices}
          world={activeChallenge.world}
          bossChallenge={activeChallenge.bossChallenge}
          onDone={() => {
            setActiveChallenge(null);
            dispatch({ type: "NAVIGATE", route: "WORLDS" });
          }}
          onError={onError}
        />
      );
    }

    case "PROGRESS":
      return <ProgressScreen services={resolvedServices} onBack={() => dispatch({ type: "GO_HOME" })} />;

    case "SETTINGS":
      return <SettingsScreen services={resolvedServices} onBack={() => dispatch({ type: "GO_HOME" })} />;

    case "VOCAB_DETAIL":
      return <SplashScreen onDone={() => {}} />;

    case "ERROR":
      return <ErrorScreen message={state.errorMessage} onAcknowledge={() => dispatch({ type: "GO_HOME" })} />;
  }
}
