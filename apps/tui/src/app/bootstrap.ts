import { loadConfig, resolveDataDirLayout, type AppConfig } from "@gofluent/config";
import { openDatabase, runMigrations, seedInitialLexemes, type DatabaseSync } from "@gofluent/db";
import {
  SqliteContentRepository, SqliteEncounterRepository, SqliteLearnerInterestRepository,
  SqliteLearnerLexemeStateRepository, SqliteLearnerProfileRepository, SqliteLearningSessionRepository,
  SqliteLexemeRepository, SqliteReviewRepository, SqliteSessionActivityRepository,
} from "@gofluent/db";
import { FakeProvider, NvidiaNimProvider, type LLMProvider } from "@gofluent/ai";
import {
  FakeTextToSpeechProvider, KokoroTTSProvider, SystemAudioPlayer,
  type AudioPlayer, type TextToSpeechProvider,
} from "@gofluent/speech";

/**
 * Composition root (ARCHITECTURE.md §22, §74): load config, resolve the data
 * directory, open SQLite, run migrations, then assemble repositories and the
 * AI provider — the first point where Provider and Learner Model meet
 * (ROADMAP Phase 2). Failure here must produce a readable terminal error
 * before any Ink rendering happens.
 */
export const LOCAL_USER_ID = "local-user";

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
  };
}

/** Only trust NVIDIA NIM when it is actually configured; otherwise stay network-free. */
function createProvider(config: AppConfig): LLMProvider {
  if (config.ai.provider === "nvidia" && config.ai.apiKey && config.ai.apiKey.trim().length > 0) {
    return new NvidiaNimProvider({ baseUrl: config.ai.baseUrl, apiKey: config.ai.apiKey, model: config.ai.model });
  }
  return new FakeProvider();
}

/** Speech is opt-in (NVIDIA_NIM.md §43) — unconfigured/disabled stays network-and-subprocess-free. */
function createTtsProvider(config: AppConfig, audioDir: string): TextToSpeechProvider {
  if (!config.speech.enabled) return new FakeTextToSpeechProvider({ available: false });
  return new KokoroTTSProvider({
    modelDir: config.speech.kokoroModelDir,
    defaultVoice: config.speech.defaultVoice,
    audioDir,
  });
}

function initializeDatabase(db: DatabaseSync): void {
  runMigrations(db);
  const now = new Date().toISOString();
  seedInitialLexemes(new SqliteLexemeRepository(db), now);
  db.prepare("INSERT OR IGNORE INTO users (id,created_at,updated_at) VALUES (?,?,?)").run(LOCAL_USER_ID, now, now);
}

export function bootstrap(): AppServices {
  const config = loadConfig();
  const layout = resolveDataDirLayout();
  const db = openDatabase(layout.databaseFile);
  initializeDatabase(db);
  return {
    config, db, userId: LOCAL_USER_ID, provider: createProvider(config), model: config.ai.model, repos: buildRepos(db),
    tts: createTtsProvider(config, layout.audioDir), audioPlayer: new SystemAudioPlayer(), audioDir: layout.audioDir,
  };
}

function defaultConfig(): AppConfig {
  return {
    ai: { provider: "fake", baseUrl: "https://example.test", model: "fake-model" },
    speech: { enabled: false, defaultVoice: "af_heart", defaultSpeed: 1.0 },
    learning: { dailyMinutes: 20, newItemsPerSession: 8 },
    dataDir: ":memory:",
  };
}

/** Used as the default when the TUI (or its tests) render without an explicit `AppServices`. */
export function createInMemoryServices(): AppServices {
  const config = defaultConfig();
  const db = openDatabase(":memory:");
  initializeDatabase(db);
  return {
    config, db, userId: LOCAL_USER_ID, provider: new FakeProvider(), model: config.ai.model, repos: buildRepos(db),
    tts: new FakeTextToSpeechProvider({ available: false }), audioPlayer: new SystemAudioPlayer({ commandExists: async () => false }), audioDir: "/tmp/gofluent-test-audio",
  };
}
