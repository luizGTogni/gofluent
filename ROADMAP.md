# Roadmap — GoFluent

## Product summary

GoFluent is an AI-based English acquisition system, delivered initially as a cross-platform TUI (terminal user interface) for Linux and Windows, built on Node.js 24 + TypeScript + React/Ink. The core value proposition is that **everything the learner consumes adapts to what they already know, and important vocabulary keeps resurfacing until it becomes active use**. The system continuously models the learner's vocabulary, comprehension, memory, interests, and recurring errors to choose or generate the best next learning experience.

Core architectural principle: **deterministic core, generative edge** — state, memory, review scheduling, and progress are managed by deterministic logic and persisted in SQLite; AI (NVIDIA NIM in v0.1.0) is used only for language generation and interpretation, never as the source of truth for learner state. Every LLM output is validated (schema + pedagogical rules) before reaching the learner or the database.

The pedagogical document `RESEARCH.md` is the pedagogical source of truth; `PRD.md` translates that into product requirements; the architecture, database, provider, and technical specs (`ARCHITECTURE.md`, `DATABASE.md`, `PROVIDER.md`, `NVIDIA_NIM.md`, `TUI.md`, `UPDATER.md`, `AGENT.md`) detail the implementation.

---

## Phase 0 — Foundation (prerequisite for everything)

**Goal:** an executable, testable project skeleton with CI, no learning features yet.

**Key deliverables:**
- pnpm workspaces monorepo (`apps/tui`, `packages/core`, application, learning-engine, lexical-engine, content-engine, ai, speech, db, config, shared) — `ARCHITECTURE.md` §5–8.
- TypeScript with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — PRD §35.
- Minimal Ink shell with state-machine navigation (`SPLASH → ONBOARDING → PLACEMENT → HOME`) — `ARCHITECTURE.md` §21, `TUI.md` §17–18.
- SQLite connected, `PRAGMA foreign_keys=ON`, WAL mode evaluated, cross-platform data directory (`~/.local/share/gofluent` / `%APPDATA%\GoFluent`) — `DATABASE.md` §4, §54–56.
- Initial migration (`0001_initial.sql`) covering the essential tables for the vertical slice: `users`, `learner_profiles`, `learner_interests`, `lexemes`, `lexeme_forms`, `chunks`, `learner_lexeme_state`, `learner_chunk_state`, `encounters`, `review_queue`, `content`, `content_target_items`, `learning_sessions`, `session_activities`, `settings` — `DATABASE.md` §107.
- `packages/config` with environment loading/validation (`.env`, variables) and precedence `defaults → config file → env vars` — `ARCHITECTURE.md` §17, §59.
- `packages/ai`: generic `LLMProvider` contract + provider registry + deterministic `FakeProvider` for tests — `PROVIDER.md` §6–14, §44.
- Initial `NvidiaNimProvider` adapter (authentication, `/v1/chat/completions`, error normalization) — `NVIDIA_NIM.md` §4–10, §27.
- Runtime validation with Zod for all AI output — PRD §36.
- Tests (Vitest), CI on Ubuntu + Windows with Node 24 — PRD §49, §51; `ARCHITECTURE.md` §84.
- `CHANGELOG.md`, SemVer 2.0.0 versioning starting at `0.1.0`.

**Cross-doc dependencies:** `ARCHITECTURE.md` (package structure) → `DATABASE.md` (schema/migrations) → `PROVIDER.md` + `NVIDIA_NIM.md` (AI abstraction) must exist *before* any learning feature, since every subsequent phase depends on these three pillars.

---

## Phase 1 — Learner Model

**Goal:** deterministically persist and update the learner's lexical state, without generating adaptive content yet.

**Key deliverables:**
- Domain entities in `packages/core`: `LearnerProfile`, `Lexeme`, `Chunk`, `LearnerLexemeState`, `LearnerChunkState`, `Encounter`, `ReviewItem` — PRD §11, `ARCHITECTURE.md` §9.
- Repositories (`LearnerProfileRepository`, `LexemeRepository`, `LearnerLexemeStateRepository`, `EncounterRepository`, `ReviewRepository`) implemented over SQLite — `DATABASE.md` §58, §110.
- Append-only Encounter system, with modalities (`READING/LISTENING/RECALL/WRITING/SPEAKING`) and outcomes (`SUCCESS/PARTIAL/FAIL/SKIPPED`) — PRD §14, `DATABASE.md` §25–31.
- Deterministic mastery update service: maps encounter → new state, distinguishing receptive vs. productive gain — PRD §13, §44 (`Mastery Update Service`).
- Deterministic, simple spaced-review scheduler (`review_priority = memory_weakness × learning_value × overdue_factor`) — PRD §15, `ARCHITECTURE.md` §43.
- "Learning value" calculation for vocabulary prioritization — PRD §17, `ARCHITECTURE.md` §42.
- Atomic transactions for the "encounter → state update → review scheduling" flow — `DATABASE.md` §57, §61.
- Initial lexical dataset (frequency, CEFR) imported via seed script, not migration — `DATABASE.md` §80–82.
- Unit tests: mastery, scheduling, coverage, learning-value (PRD §49).

**Dependencies:** requires Phase 0 complete (database, types, providers). Does not yet depend on AI content generation — it is 100% deterministic core, allowing it to be tested in isolation from `packages/ai`.

---

## Phase 2 — Learning Loop (Daily Journey + Story)

**Goal:** first end-to-end learning experience using AI to generate validated content.

**Key deliverables:**
- Complete onboarding (native language, goals, interests, self-assessment) — PRD §9.
- Adaptive placement assessment (bootstraps lexical state, not precise CEFR classification) — PRD §9.6, `ARCHITECTURE.md` §45.
- Deterministic session planner (`Daily Journey Planner`): decides `review_items`, `new_items`, `target_chunks`, `story_topic` — PRD §10.1, `ARCHITECTURE.md` §46–47.
- Adaptive story generation via NIM with a structured contract (`StorySchema` via Zod) — PRD §18, `PROVIDER.md` §27, `NVIDIA_NIM.md` §23–24.
- "Generate → Validate → Repair" pipeline: schema validation (layer 1) + lexical/pedagogical known/new coverage validation (layer 2) — `ARCHITECTURE.md` §36–37, `NVIDIA_NIM.md` §25.
- Content-engine: lexical coverage analysis, known/new ratio, target-item presence, rejection/regeneration — PRD §41, `ARCHITECTURE.md` §13.
- Story flow (read, highlight target vocabulary, explain, comprehension questions, retell) — PRD §19.
- Contextual Review screen (cloze, sentence completion, choose-the-natural-phrase) — PRD §16.
- Active recall with typed answers — PRD §23 (typed mode).
- Progress screen with metrics labeled as estimates — PRD §27.
- Resumable sessions (`learning_sessions` / `session_activities` with `IN_PROGRESS` → offer to resume) — `DATABASE.md` §48.
- TUI screens: Splash, Onboarding, Placement, Home, Daily Journey, Story, Review, Vocabulary Detail, Progress, Settings, Error — PRD §64.
- Integration tests (NIM adapter, planner) and TUI tests (navigation, onboarding, journey, errors) — PRD §49.

**Dependencies:** requires Phase 1 (learner state) + `packages/ai`/`packages/content-engine` from Phase 0/2. This is the first point where Provider (`PROVIDER.md`/`NVIDIA_NIM.md`) and Learner Model (`DATABASE.md`/Phase 1) meet. This complete phase corresponds to **`v0.1.0` (P0 of PRD §62)**.

**Exit criteria:** the acceptance criteria of PRD §81 and `ARCHITECTURE.md` §102 — complete onboarding → placement → journey → progress flow, persistent across restarts, green CI on Linux/Windows.

---

## Phase 3 — Audio (TTS, Listening)

**Goal:** make audio a first-class modality (P1 of the PRD).

**Key deliverables:**
- `TextToSpeechProvider` abstraction + NVIDIA Speech NIM adapter (full synthesis, cache keyed by text+voice+speed hash) — PRD §21, `ARCHITECTURE.md` §49, `NVIDIA_NIM.md` §40–42.
- `AudioPlayer` abstraction isolating OS playback (avoid Linux dependencies like PulseAudio/ffplay without a fallback) — `ARCHITECTURE.md` §50, §68.
- Listening modes: normal, slow, sentence-by-sentence, with/without transcript, replay — PRD §20.
- "Listen first, then reveal text" flow — PRD §19.
- Filesystem audio cache (not a BLOB in SQLite) — `DATABASE.md` §70–71.
- Graceful degradation when TTS is unavailable (allow reading without audio) — `NVIDIA_NIM.md` §43.

**Dependencies:** requires Phase 2 (Story/Journey) to have text content to synthesize. Depends on the speech contract defined in `NVIDIA_NIM.md` §37–43, which is independent of the LLM provider.

---

## Phase 4 — Speak Mode, ASR, and Error Memory (`0.2.x`)

**Goal:** guided conversation with the AI tutor and capture of recurring error patterns.

**Key deliverables:**
- Speak Mode with typed conversation (mandatory) and microphone conversation (optional) — PRD §23.
- `SpeechToTextProvider` abstraction + NVIDIA ASR NIM adapter (REST first, WebSocket later) — PRD §22, `NVIDIA_NIM.md` §38–39.
- Conversation flow: scenario → context → learner input → ASR (if spoken) → LLM interpretation → response+feedback → encounter extraction → evidence persistence — `ARCHITECTURE.md` §52.
- Concise conversation feedback, prioritizing a few useful corrections — PRD §24.
- Error memory (`learner_errors`), aggregated by normalized pattern (e.g., "do a mistake" → "make a mistake") — PRD §25, `DATABASE.md` §49–51.
- Error categories (GRAMMAR, COLLOCATION, WORD_CHOICE, WORD_ORDER, PRONUNCIATION, SPELLING, ARTICLE, PREPOSITION, PHRASAL_VERB) — `ARCHITECTURE.md` §54.
- Contextual SRS improvements based on recurring errors.

**Dependencies:** requires Phase 2 (learning loop + learner state) and Phase 3 (audio/cache infrastructure) for ASR to work end-to-end.

---

## Phase 5 — Learn From Anything (`0.3.x`)

**Goal:** allow ingestion of learner-supplied content.

**Key deliverables:**
- Pipeline: user content → parse → lexical analysis → difficulty estimation → high-value vocabulary extraction → lesson generation → review integration — `ARCHITECTURE.md` §93.
- Reuse of the existing `lexical-engine`/`content-engine` (no parallel system).
- New `ImportedContent` entity (mentioned as future in `DATABASE.md` §7).

**Dependencies:** requires the full lexical pipeline (Phase 1) and content validation (Phase 2) to be mature and stable.

---

## Phase 6 — Worlds, Boss Challenges, and Gamification (`0.4.x`)

**Goal:** thematic progression structure and realistic communication challenges.

**Key deliverables:**
- First 3 worlds: Everyday Life, Travel, Technology, each with vocabulary, chunks, stories, conversation scenarios, and progress — PRD §29.
- Boss Challenge (e.g., "Airport Check-In"), evaluating task completion, comprehension, and use of target phrases — PRD §30.
- Light gamification: streak, journey completion, repertoire growth, world/topic mastery, personal bests. XP may exist but is not the primary metric — PRD §28.
- New future entities: `World`, `WorldProgress`, `BossChallenge` — `DATABASE.md` §7.

**Dependencies:** requires the learning loop (Phase 2), Speak Mode (Phase 4) for conversational challenges, and mature story content.

---

## Phase 7 — Immersion / Media Preparation (`0.5.x`)

**Goal:** prepare the learner for real content consumption (not direct copyrighted streaming).

**Key deliverables:**
- Content recommendation engine based on lexical state.
- Media preparation (possibly a future `MediaPreparation` entity) — `DATABASE.md` §7.
- Increased exposure to listening without a transcript.

**Dependencies:** requires maturity of the lexical model (Phase 1) and listening (Phase 3).

---

## Phase 8 — Cloud-Ready Architecture (`0.6.x+`)

**Goal:** prepare the system for remote sync and multiple devices/clients, without compromising the local-first model.

**Key deliverables:**
- Stable IDs (UUID/ULID) and timestamps already in place since Phase 0 ease this transition — `DATABASE.md` §9–10, §103–105.
- Possible `SyncState`, sync metadata (`device_id`, `sync_version`, `deleted_at`) — `DATABASE.md` §104.
- Abstraction for multiple local profiles (`users` already supports this) — `DATABASE.md` §105.
- Possible web client reusing the same `application`/domain services (architecture already isolates Ink in `apps/tui`) — `ARCHITECTURE.md` §94.
- Standalone binary distribution with full updater (download, SHA-256 checksum, staging, rollback) — `UPDATER.md` §30–38. This is a separate technical prerequisite from sync itself, but belongs to the same distribution-maturity phase.

**Dependencies:** the most speculative phase; depends on all previous phases being stable and the data model already having been designed (since Phase 0) so it doesn't block this evolution.

---

## Cross-cutting track: Updater (does not block product phases)

Independent of the product phases, but must be ready **before the first public `0.1.0` release**:
- Non-blocking update check via GitHub Releases, SemVer comparison, no downgrade — `UPDATER.md` §3–10.
- Notification deferred during active learning (shown on Home or at end of Journey) — `UPDATER.md` §12.
- "Notification-first" strategy via package manager instructions (no auto-update) for the initial npm/pnpm distribution — `UPDATER.md` §7, §17.
- Full binary self-updater is future work (Phase 8), not part of the MVP.

---

## Identified risks and uncertainties

1. **Which NIM endpoint to use (`/v1/chat/completions` vs `/v1/responses`)** — `NVIDIA_NIM.md` §3 recommends `/v1/chat/completions` for the MVP but leaves adopting `/v1/responses` later open; an implementation decision, non-blocking, but should be centralized in the adapter.
2. **SQLite driver/ORM choice undecided** — `DATABASE.md` §112 lists Drizzle, Kysely, and better-sqlite3 as acceptable options, with no final choice; risk of problematic native dependencies on Windows (§113) — a pending technical decision that must be resolved in Phase 0.
3. **WAL mode on Windows not validated** — `DATABASE.md` §55 calls for explicit compatibility testing before relying on this configuration.
4. **Credential storage (OS keychain vs. env var)** — `NVIDIA_NIM.md` §6 and `PROVIDER.md` §11 suggest prioritizing the OS keychain, but acknowledge v0.1.0 may start with just an environment variable due to native-dependency risk — an open scope decision.
5. **12 open product questions in PRD §76** (e.g., how many new items per session is sustainable, how much grammar beginners ask for, whether streaks motivate or become addictive) — should be answered through testing with real users during `0.1.0`/`0.2.x`, not upfront speculation.
6. **Package-manager detection** for update instructions is optional and must be conservative — `UPDATER.md` §16; risk of showing the wrong command if the heuristic fails.
7. **Conversation persistence** — `DATABASE.md` §94 recommends not storing full conversations by default, preferring structured evidence instead; this may limit debugging/quality assessment of Speak Mode and needs an explicit product decision when Phase 4 begins.
8. **Final npm package name** not yet registered — `UPDATER.md` §15 blocks hardcoding the install command until this is decided.
9. **English lexical frequency/CEFR dataset** (source, license, coverage) is not specified in the docs — a content prerequisite for Phase 1/2 that has no defined owner yet.
10. **Open research backlog** (`PRD.md` §77): FSRS, CEFR lexical mapping, pronunciation scoring, automatic content difficulty — items that could change the scheduler/mastery design beyond v0.1.0; any relevant change should update `RESEARCH.md` before or alongside implementation.

---

## Immediate next steps

1. **Resolve Phase 0's pending technical decisions before coding**: SQLite driver/ORM (risk item 2) and credential strategy (risk item 4), since both affect the structure of `packages/db` and `packages/ai` from the first commit.
2. **Create the monorepo and package skeleton** per `ARCHITECTURE.md` §5, with strict `tsconfig` and Linux+Windows CI running from day one (even with no features).
3. **Write the `0001_initial.sql` migration** exactly as listed in `DATABASE.md` §107, and the minimal repositories (`LearnerProfileRepository`, `LearnerLexemeStateRepository`, `EncounterRepository`) with integration tests against real SQLite.
4. **Implement the generic `LLMProvider` contract + `FakeProvider`** before the real NVIDIA adapter, so the `learning-engine` can be developed and tested without depending on network/credentials.
5. **Implement the minimal `NvidiaNimProvider` adapter** (chat completion + credential validation + error normalization) and validate it with an optional live test (`pnpm test:ai:live`).
6. **Only then tackle Phase 1 (Learner Model)** — it is the biggest product-value bottleneck and the only place where "the system models the learner" (the product's central promise) actually becomes code.
