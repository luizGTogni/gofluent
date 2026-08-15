import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { FakeProvider } from "@gofluent/ai";
import { FakeTextToSpeechProvider, SystemAudioPlayer } from "@gofluent/speech";
import type { LearningSession, SessionActivity } from "@gofluent/core";
import { StoryScreen } from "./StoryScreen.js";
import { createInMemoryServices, LOCAL_USER_ID, type AppServices } from "../app/bootstrap.js";

const now = "2026-01-01T00:00:00.000Z";

const STORY_TEXT = "The sun rose over the quiet town. Birds sang in the trees. A woman walked her dog.";

function seedKnownWords(services: AppServices): void {
  const words = Array.from(new Set(STORY_TEXT.toLowerCase().match(/[a-z']+/g) ?? []));
  for (const [index, word] of words.entries()) {
    const id = `lex_${index}_${word}`;
    services.db.prepare("INSERT INTO lexemes (id,language,lemma,created_at,updated_at) VALUES (?,?,?,?,?)").run(id, "en", word, now, now);
    services.db.prepare(
      "INSERT INTO learner_lexeme_state (learner_id,lexeme_id,encounters,heard_count,reading_recognition,listening_recognition,recall_score,productive_score,created_at,updated_at) VALUES (?,?,0,0,0,0,0,0,?,?)",
    ).run(LOCAL_USER_ID, id, now, now);
  }
}

function seedSessionAndActivity(services: AppServices): { session: LearningSession; activity: SessionActivity } {
  services.db.prepare("INSERT INTO learning_sessions (id,learner_id,session_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?)").run("s1", LOCAL_USER_ID, "DAILY_JOURNEY", "IN_PROGRESS", now, now);
  services.db.prepare("INSERT INTO session_activities (id,session_id,activity_type,sequence_number,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run("a1", "s1", "STORY", 0, "PLANNED", now, now);
  const session: LearningSession = { id: "s1", learnerId: LOCAL_USER_ID, sessionType: "DAILY_JOURNEY", status: "IN_PROGRESS", createdAt: now, updatedAt: now };
  const activity: SessionActivity = { id: "a1", sessionId: "s1", activityType: "STORY", sequenceNumber: 0, status: "PLANNED", createdAt: now, updatedAt: now };
  return { session, activity };
}

function queueStory(services: AppServices): void {
  (services.provider as FakeProvider).enqueue("story", {
    title: "A Quiet Morning",
    text: STORY_TEXT,
    targetItems: ["sun"],
    comprehensionQuestions: [{ question: "What rose over the town?", options: ["the sun", "a car"], correctOptionIndex: 0 }],
  });
}

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("StoryScreen", () => {
  it("skips straight to READING with transcript visible when speech is unavailable", async () => {
    const services = createInMemoryServices();
    const { session, activity } = seedSessionAndActivity(services);
    seedKnownWords(services);
    queueStory(services);

    const { lastFrame, unmount } = render(
      <StoryScreen services={services} session={session} activity={activity} onComplete={() => {}} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("A Quiet Morning"), { timeout: 2000 });
    expect(lastFrame()).toContain("The sun rose over the quiet town");
    expect(lastFrame()).not.toContain("Listening mode");

    unmount();
  });

  it("enters the LISTENING phase with hidden transcript when speech is enabled and available, and supports mode/transcript/replay controls", async () => {
    const base = createInMemoryServices();
    const services: AppServices = {
      ...base,
      config: { ...base.config, speech: { ...base.config.speech, enabled: true } },
      tts: new FakeTextToSpeechProvider({ available: true }),
      audioPlayer: new SystemAudioPlayer({ commandExists: async () => false }),
    };
    const { session, activity } = seedSessionAndActivity(services);
    seedKnownWords(services);
    queueStory(services);

    const { lastFrame, stdin, unmount } = render(
      <StoryScreen services={services} session={session} activity={activity} onComplete={() => {}} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Listening mode: Normal"), { timeout: 2000 });
    expect(lastFrame()).not.toContain("The sun rose over the quiet town");

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Audio unavailable|Playback finished/), { timeout: 2000 });

    stdin.write("t");
    await tick();
    expect(lastFrame()).toContain("The sun rose over the quiet town");

    stdin.write("m");
    await tick();
    expect(lastFrame()).toContain("Listening mode: Slow");

    stdin.write("m");
    await tick();
    expect(lastFrame()).toContain("Listening mode: Sentence-by-sentence");
    expect(lastFrame()).toContain("(1/3)");

    stdin.write("\r");
    await tick();
    expect(lastFrame()).toContain("(2/3)");

    unmount();
  });

  it("reveals transcript and moves to READING when Enter is pressed at the end of a listening pass", async () => {
    const base = createInMemoryServices();
    const services: AppServices = {
      ...base,
      config: { ...base.config, speech: { ...base.config.speech, enabled: true } },
      tts: new FakeTextToSpeechProvider({ available: true }),
      audioPlayer: new SystemAudioPlayer({ commandExists: async () => false }),
    };
    const { session, activity } = seedSessionAndActivity(services);
    seedKnownWords(services);
    queueStory(services);

    const { lastFrame, stdin, unmount } = render(
      <StoryScreen services={services} session={session} activity={activity} onComplete={() => {}} onError={() => {}} />,
    );

    await vi.waitFor(() => expect(lastFrame()).toContain("Listening mode: Normal"), { timeout: 2000 });
    stdin.write("\r");
    await vi.waitFor(() => expect(lastFrame()).toContain("The sun rose over the quiet town"), { timeout: 2000 });
    expect(lastFrame()).toContain("Press Enter to continue.");

    unmount();
  });
});
