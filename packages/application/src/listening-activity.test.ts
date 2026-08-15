import { describe, expect, it } from "vitest";
import { openDatabase, runMigrations } from "@gofluent/db";
import { FakeTextToSpeechProvider } from "@gofluent/speech";
import { splitIntoSentences, speedForMode, synthesizeCachedAudio } from "./listening-activity.js";

const now = new Date("2026-01-01T00:00:00.000Z");

describe("synthesizeCachedAudio", () => {
  it("synthesizes once and reuses the cached asset on repeat calls", async () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    const tts = new FakeTextToSpeechProvider();

    const first = await synthesizeCachedAudio(db, tts, { text: "Hello there.", language: "en", voice: "fake-voice", speed: 1.0 }, now);
    const second = await synthesizeCachedAudio(db, tts, { text: "Hello there.", language: "en", voice: "fake-voice", speed: 1.0 }, now);

    expect(second.id).toBe(first.id);
    expect(tts.callCount).toBe(1);
  });

  it("re-synthesizes for a different voice or speed", async () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    const tts = new FakeTextToSpeechProvider();

    await synthesizeCachedAudio(db, tts, { text: "Hello there.", language: "en", voice: "fake-voice", speed: 1.0 }, now);
    await synthesizeCachedAudio(db, tts, { text: "Hello there.", language: "en", voice: "fake-voice", speed: 0.75 }, now);

    expect(tts.callCount).toBe(2);
  });

  it("propagates provider failure (caller decides how to degrade) rather than swallowing it", async () => {
    const db = openDatabase(":memory:");
    runMigrations(db);
    const tts = new FakeTextToSpeechProvider({ available: false });

    await expect(
      synthesizeCachedAudio(db, tts, { text: "Hello there.", language: "en", voice: "fake-voice", speed: 1.0 }, now),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});

describe("splitIntoSentences", () => {
  it("splits on sentence-ending punctuation", () => {
    expect(splitIntoSentences("The cat sat. It looked around! Then it ran.")).toEqual([
      "The cat sat.",
      "It looked around!",
      "Then it ran.",
    ]);
  });

  it("ignores empty input", () => {
    expect(splitIntoSentences("   ")).toEqual([]);
  });
});

describe("speedForMode", () => {
  it("slows down for SLOW mode and leaves NORMAL untouched", () => {
    expect(speedForMode("NORMAL", 1.0)).toBe(1.0);
    expect(speedForMode("SLOW", 1.0)).toBe(0.75);
    expect(speedForMode("SENTENCE_BY_SENTENCE", 1.0)).toBe(1.0);
  });
});
