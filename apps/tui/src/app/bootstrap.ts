import { loadConfig, resolveConfigFilePath, resolveDataDirLayout, type AppConfig } from "@gofluent/config";
import { ensureDeviceIdentity, openDatabase, runMigrations, seedBossChallenges, seedInitialLexemes, seedWorlds, type DatabaseSync } from "@gofluent/db";
import {
  SqliteBossChallengeAttemptRepository, SqliteBossChallengeRepository,
  SqliteContentRepository, SqliteDeviceIdentityRepository, SqliteEncounterRepository, SqliteLearnerInterestRepository,
  SqliteLearnerLexemeStateRepository, SqliteLearnerProfileRepository, SqliteLearningSessionRepository,
  SqliteLexemeRepository, SqliteMediaPreparationRepository, SqliteReviewRepository, SqliteSessionActivityRepository,
  SqliteWorldProgressRepository, SqliteWorldRepository,
} from "@gofluent/db";
import { FakeProvider, NvidiaNimProvider, type LLMProvider } from "@gofluent/ai";
import {
  EdgeTTSProvider, FakeSpeechToTextProvider, FakeTextToSpeechProvider, FallbackTextToSpeechProvider,
  KokoroTTSProvider, NvidiaAsrProvider, SystemAudioPlayer,
  type AudioPlayer, type SpeechToTextProvider, type TextToSpeechProvider,
} from "@gofluent/speech";
import { getActiveUserId } from "@gofluent/application";
import { GitHubReleaseSource, UpdateChecker } from "@gofluent/updater";
import packageJson from "../../package.json" with { type: "json" };

/**
 * Composition root (ARCHITECTURE.md §22, §74): load config, resolve the data
 * directory, open SQLite, run migrations, then assemble repositories and the
 * AI provider — the first point where Provider and Learner Model meet
 * (ROADMAP Phase 2). Failure here must produce a readable terminal error
 * before any Ink rendering happens.
 */
export const LOCAL_USER_ID = "local-user";
/** UPDATER.md §29 "current version comes from package metadata." */
export const GOFLUENT_VERSION: string = packageJson.version;

export interface AppRepos {
  profiles: SqliteLearnerProfileRepository;
  interests: SqliteLearnerInterestRepository;
  lexemes: SqliteLexemeRepository;
  lexemeStates: SqliteLearnerLexemeStateRepository;
  encounters: SqliteEncounterRepository;
  reviews: SqliteReviewRepository;
  content: SqliteContentRepository;
  sessions: SqliteLearningSessionRepository;
  sessionActivities: SqliteSessionActivityRepository;
  worlds: SqliteWorldRepository;
  worldProgress: SqliteWorldProgressRepository;
  bossChallenges: SqliteBossChallengeRepository;
  bossChallengeAttempts: SqliteBossChallengeAttemptRepository;
  mediaPreparation: SqliteMediaPreparationRepository;
}

export interface AppServices {
  config: AppConfig;
  db: DatabaseSync;
  userId: string;
  provider: LLMProvider;
  model: string;
  repos: AppRepos;
  tts: TextToSpeechProvider;
  audioPlayer: AudioPlayer;
  audioDir: string;
  asr: SpeechToTextProvider;
  deviceId: string;
  currentVersion: string;
  updateChecker: UpdateChecker | null;
  /** Where SettingsScreen → API Keys saves credentials (ARCHITECTURE.md §59 — the on-disk half of layered config). */
  configFilePath: string;
}

function buildRepos(db: DatabaseSync): AppRepos {
  return {
    profiles: new SqliteLearnerProfileRepository(db),
    interests: new SqliteLearnerInterestRepository(db),
    lexemes: new SqliteLexemeRepository(db),
    lexemeStates: new SqliteLearnerLexemeStateRepository(db),
    encounters: new SqliteEncounterRepository(db),
    reviews: new SqliteReviewRepository(db),
    content: new SqliteContentRepository(db),
    sessions: new SqliteLearningSessionRepository(db),
    sessionActivities: new SqliteSessionActivityRepository(db),
    worlds: new SqliteWorldRepository(db),
    worldProgress: new SqliteWorldProgressRepository(db),
    bossChallenges: new SqliteBossChallengeRepository(db),
    bossChallengeAttempts: new SqliteBossChallengeAttemptRepository(db),
    mediaPreparation: new SqliteMediaPreparationRepository(db),
  };
}

/** Only trust NVIDIA NIM when it is actually configured; otherwise stay network-free. */
function createProvider(config: AppConfig): LLMProvider {
  if (config.ai.provider === "nvidia" && config.ai.apiKey && config.ai.apiKey.trim().length > 0) {
    return new NvidiaNimProvider({ baseUrl: config.ai.baseUrl, apiKey: config.ai.apiKey, model: config.ai.model });
  }
  return new FakeProvider();
}

/**
 * Speech is opt-in (NVIDIA_NIM.md §43) — unconfigured/disabled stays
 * network-and-subprocess-free. When enabled, local Kokoro is tried first;
 * the online Edge Read Aloud fallback is a separate opt-in
 * (`speech.onlineFallbackEnabled`) since — unlike Kokoro — it sends learner
 * text off-device.
 */
function createTtsProvider(config: AppConfig, audioDir: string): TextToSpeechProvider {
  if (!config.speech.enabled) return new FakeTextToSpeechProvider({ available: false });

  const providers: TextToSpeechProvider[] = [
    new KokoroTTSProvider({
      modelDir: config.speech.kokoroModelDir,
      defaultVoice: config.speech.defaultVoice,
      audioDir,
    }),
  ];
  if (config.speech.onlineFallbackEnabled) {
    providers.push(new EdgeTTSProvider({ defaultVoice: config.speech.edgeDefaultVoice, audioDir }));
  }
  return new FallbackTextToSpeechProvider(providers);
}

/**
 * Microphone conversation is optional (PRD §23) — unconfigured/disabled
 * stays network-free, and Speak Mode degrades to typed-only input
 * (NVIDIA_NIM.md §43).
 */
function createAsrProvider(config: AppConfig): SpeechToTextProvider {
  if (!config.asr.enabled || !config.asr.apiKey || config.asr.apiKey.trim().length === 0) {
    return new FakeSpeechToTextProvider({ available: false });
  }
  return new NvidiaAsrProvider({ baseUrl: config.asr.baseUrl, apiKey: config.asr.apiKey, model: config.asr.model });
}

/**
 * Update checking stays a no-op until a GitHub repo is registered
 * (ROADMAP risk #8) — same "unconfigured → network-free" pattern as the
 * AI/ASR providers above (UPDATER.md §10 checkOnStartup).
 */
function createUpdateChecker(config: AppConfig, currentVersion: string): UpdateChecker | null {
  if (!config.updates.checkOnStartup || !config.updates.githubOwner || !config.updates.githubRepo) return null;
  const source = new GitHubReleaseSource({ owner: config.updates.githubOwner, repo: config.updates.githubRepo, currentVersion });
  return new UpdateChecker(source, currentVersion);
}

function initializeDatabase(db: DatabaseSync): void {
  runMigrations(db);
  const now = new Date().toISOString();
  seedInitialLexemes(new SqliteLexemeRepository(db), now);
  seedWorlds(new SqliteWorldRepository(db), now);
  seedBossChallenges(new SqliteBossChallengeRepository(db), now);
  db.prepare("INSERT OR IGNORE INTO users (id,created_at,updated_at) VALUES (?,?,?)").run(LOCAL_USER_ID, now, now);
  ensureDeviceIdentity(new SqliteDeviceIdentityRepository(db), now);
}

export function bootstrap(): AppServices {
  const config = loadConfig();
  const layout = resolveDataDirLayout();
  const db = openDatabase(layout.databaseFile);
  initializeDatabase(db);
  return {
    config, db, userId: getActiveUserId(db, LOCAL_USER_ID), provider: createProvider(config), model: config.ai.model, repos: buildRepos(db),
    tts: createTtsProvider(config, layout.audioDir), audioPlayer: new SystemAudioPlayer(), audioDir: layout.audioDir,
    asr: createAsrProvider(config),
    deviceId: ensureDeviceIdentity(new SqliteDeviceIdentityRepository(db), new Date().toISOString()).deviceId,
    currentVersion: GOFLUENT_VERSION, updateChecker: createUpdateChecker(config, GOFLUENT_VERSION),
    configFilePath: resolveConfigFilePath(),
  };
}

function defaultConfig(): AppConfig {
  return {
    ai: { provider: "fake", baseUrl: "https://example.test", model: "fake-model" },
    speech: { enabled: false, defaultVoice: "af_heart", defaultSpeed: 1.0, onlineFallbackEnabled: false, edgeDefaultVoice: "en-US-AriaNeural" },
    asr: { enabled: false, baseUrl: "https://asr.example.test" },
    learning: { dailyMinutes: 20, newItemsPerSession: 8 },
    updates: { checkOnStartup: false },
    dataDir: ":memory:",
  };
}

/** Used as the default when the TUI (or its tests) render without an explicit `AppServices`. */
export function createInMemoryServices(): AppServices {
  const config = defaultConfig();
  const db = openDatabase(":memory:");
  initializeDatabase(db);
  return {
    config, db, userId: getActiveUserId(db, LOCAL_USER_ID), provider: new FakeProvider(), model: config.ai.model, repos: buildRepos(db),
    tts: new FakeTextToSpeechProvider({ available: false }), audioPlayer: new SystemAudioPlayer({ commandExists: async () => false }), audioDir: "/tmp/gofluent-test-audio",
    asr: new FakeSpeechToTextProvider({ available: false }),
    deviceId: ensureDeviceIdentity(new SqliteDeviceIdentityRepository(db), new Date().toISOString()).deviceId,
    currentVersion: GOFLUENT_VERSION, updateChecker: null,
    configFilePath: "/tmp/gofluent-test-config/config.json",
  };
}
