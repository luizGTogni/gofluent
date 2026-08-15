import React, { useState } from "react";
import { Box, Text } from "ink";
import { completeOnboarding } from "@gofluent/application";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface OnboardingScreenProps {
  services: AppServices;
  onDone: () => void;
  onError: (message: string) => void;
}

const NATIVE_LANGUAGES = ["Portuguese", "Spanish", "French", "German", "Other"];
const DAILY_MINUTES_OPTIONS = [10, 15, 20, 30, 45];
const INTEREST_OPTIONS = ["travel", "cooking", "technology", "movies", "sports", "business", "music", "science"];

type Step = "LANGUAGE" | "MINUTES" | "INTERESTS" | "SUMMARY";

/** Native language, goals, interests (PRD §9.1-9.5). Self-assessment happens in the Placement screen (PRD §9.6). */
export function OnboardingScreen({ services, onDone, onError }: OnboardingScreenProps): React.JSX.Element {
  const [step, setStep] = useState<Step>("LANGUAGE");
  const [nativeLanguage, setNativeLanguage] = useState<string | null>(null);
  const [dailyMinutes, setDailyMinutes] = useState<number | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  function finish(): void {
    try {
      completeOnboarding(services.db, {
        userId: services.userId,
        nativeLanguage: nativeLanguage ?? "Other",
        targetLanguage: "en",
        dailyMinutes: dailyMinutes ?? 20,
        interests,
      });
      onDone();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Welcome to GoFluent</Text>
      {step === "LANGUAGE" && (
        <Box flexDirection="column">
          <Text>What is your native language?</Text>
          <SelectList
            items={NATIVE_LANGUAGES.map((label) => ({ label, value: label }))}
            onSelect={([value]) => { setNativeLanguage(value ?? "Other"); setStep("MINUTES"); }}
          />
        </Box>
      )}
      {step === "MINUTES" && (
        <Box flexDirection="column">
          <Text>How many minutes a day do you want to study English?</Text>
          <SelectList
            items={DAILY_MINUTES_OPTIONS.map((m) => ({ label: `${m} minutes`, value: m }))}
            onSelect={([value]) => { setDailyMinutes(value ?? 20); setStep("INTERESTS"); }}
          />
        </Box>
      )}
      {step === "INTERESTS" && (
        <Box flexDirection="column">
          <Text>Pick a few interests — they shape your stories.</Text>
          <SelectList
            items={INTEREST_OPTIONS.map((label) => ({ label, value: label }))}
            mode="multi"
            minSelected={1}
            onSelect={(values) => { setInterests(values); setStep("SUMMARY"); }}
          />
        </Box>
      )}
      {step === "SUMMARY" && (
        <Box flexDirection="column">
          <Text>Native language: {nativeLanguage}</Text>
          <Text>Daily goal: {dailyMinutes} minutes</Text>
          <Text>Interests: {interests.join(", ")}</Text>
          <Text dimColor>Press Enter to continue to your placement assessment.</Text>
          <SelectList items={[{ label: "Continue", value: "continue" }]} onSelect={finish} />
        </Box>
      )}
    </Box>
  );
}
