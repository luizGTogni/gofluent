# ARCHITECTURE.md — GoFluent Technical Architecture

> **Project:** GoFluent  
> **Document:** Technical Architecture  
> **Initial Target Version:** `0.1.0`  
> **Primary Runtime:** Node.js 24 LTS  
> **Language:** TypeScript  
> **UI:** React + Ink TUI  
> **Persistence:** SQLite  
> **AI Provider:** NVIDIA NIM  
> **Platforms:** Linux x64 and Windows x64  
> **Architecture Principle:** Deterministic core, generative edge  
> **Pedagogical Source of Truth:** `RESEARCH.md`  
> **Product Source of Truth:** `PRD.md`  
> **Agent Operational Guide:** `AGENT.md`

---

# 1. Purpose

This document defines the technical architecture for GoFluent.

It explains:

- repository structure;
- module boundaries;
- domain ownership;
- data flow;
- persistence;
- AI provider integration;
- speech integration;
- TUI architecture;
- runtime configuration;
- validation boundaries;
- error handling;
- testing;
- cross-platform constraints;
- release architecture;
- expected evolution beyond the MVP.

This document should be read together with:

```text
RESEARCH.md
PRD.md
AGENT.md
```

---

# 2. Architectural Goals

The architecture must support the following product requirements:

1. A learner profile persists across sessions.
2. Vocabulary state is explicit and structured.
3. Receptive and productive language knowledge are tracked separately.
4. Learning history is derived from encounters.
5. Review scheduling is deterministic.
6. LLMs generate language but do not own learner state.
7. Generated content is validated before it reaches the learner.
8. The MVP runs on Linux and Windows.
9. The first client is a TUI.
10. AI providers can be replaced without rewriting domain logic.
11. Speech providers can be replaced independently.
12. The codebase remains small enough to understand during `0.x`.
13. The system is modular enough to support future web/mobile clients.
14. The architecture must continuously align with `RESEARCH.md`.

---

# 3. Primary Architecture Principle

GoFluent follows:

> **Deterministic Core + Generative Edge**

The deterministic core owns all stateful and correctness-sensitive behavior.

The generative edge provides language generation and interpretation.

## Deterministic Core

Owns:

```text
learner profile
vocabulary state
memory state
review schedule
lexical coverage
session progression
content validation
progress metrics
database writes
migrations
versioning
configuration
business rules
```

## Generative Edge

Owns:

```text
story generation
examples
explanations
dialogue
feedback wording
content adaptation
open-ended response interpretation
```

The architecture must not collapse these two concerns.

---

# 4. High-Level System Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                         GoFluent                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     apps/tui                                │
│                  React + Ink UI                             │
│                         │                                   │
│                         ▼                                   │
│                Application Services                         │
│                         │                                   │
│         ┌───────────────┼───────────────┐                   │
│         │               │               │                   │
│         ▼               ▼               ▼                   │
│  Learning Engine   Lexical Engine   Content Engine           │
│         │               │               │                   │
│         └───────────────┼───────────────┘                   │
│                         │                                   │
│                         ▼                                   │
│                      Core Domain                            │
│                         │                                   │
│         ┌───────────────┼──────────────────┐                │
│         │               │                  │                │
│         ▼               ▼                  ▼                │
│      Database         AI Layer          Speech Layer         │
│       SQLite        NVIDIA NIM        NVIDIA ASR / Kokoro TTS│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 5. Repository Structure

Recommended monorepo:

```text
gofluent/
│
├── apps/
│   └── tui/
│       ├── src/
│       │   ├── app/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── navigation/
│       │   └── index.tsx
│       └── package.json
│
├── packages/
│   ├── core/
│   │   └── src/
│   ├── application/
│   │   └── src/
│   ├── learning-engine/
│   │   └── src/
│   ├── lexical-engine/
│   │   └── src/
│   ├── content-engine/
│   │   └── src/
│   ├── ai/
│   │   └── src/
│   ├── speech/
│   │   └── src/
│   ├── db/
│   │   └── src/
│   ├── config/
│   │   └── src/
│   └── shared/
│       └── src/
│
├── docs/
│   └── adr/
│
├── evals/
│
├── scripts/
│
├── RESEARCH.md
├── PRD.md
├── AGENT.md
├── ARCHITECTURE.md
├── CHANGELOG.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

# 6. Why a Monorepo

A monorepo is preferred because the MVP is one product with multiple strongly related packages.

Advantages:

- explicit package boundaries;
- shared TypeScript types;
- unified versioning;
- simple CI;
- easy local development;
- straightforward future addition of web/mobile clients;
- no need for distributed infrastructure.

Avoid microservices in the MVP.

---

# 7. Architectural Layers

The system is divided into the following conceptual layers:

```text
Presentation
Application
Domain
Infrastructure
External Providers
```

## Presentation

The TUI.

## Application

Coordinates user actions and use cases.

## Domain

Contains learning rules and domain models.

## Infrastructure

SQLite, configuration, filesystem, logging.

## External Providers

NVIDIA NIM and speech services.

Dependency direction should flow inward.

---

# 8. Dependency Rule

Preferred dependency direction:

```text
apps/tui
   ↓
application
   ↓
learning-engine / lexical-engine / content-engine
   ↓
core
```

Infrastructure implementations depend on interfaces defined inward:

```text
db implementation
      ↓ implements
repository interfaces in core/application
```

Similarly:

```text
NvidiaNimProvider
      ↓ implements
LLMProvider
```

Domain packages must not import the TUI.

---

# 9. `packages/core`

`core` contains domain language and stable interfaces.

Examples:

```text
entities
value objects
domain enums
repository contracts
provider contracts
domain errors
shared identifiers
```

Example entities:

```text
LearnerProfile
Lexeme
Chunk
LearnerLexemeState
LearnerChunkState
Encounter
ReviewItem
LearningSession
LearnerError
```

The core package should have minimal dependencies.

---

# 10. `packages/application`

This package coordinates use cases.

Examples:

```text
StartOnboarding
CompletePlacement
StartDailyJourney
SubmitRecallAnswer
GenerateAdaptiveStory
CompleteStory
StartConversation
CompleteSession
GetProgress
```

Application services may orchestrate:

```text
domain engines
repositories
AI providers
speech providers
```

They should not contain UI rendering.

---

# 11. `packages/learning-engine`

Owns pedagogical state transitions.

Responsibilities:

```text
session planning
Daily Journey composition
mastery updates
review result processing
productive/receptive state changes
error weighting
session completion
```

Example pure function:

```ts
updateLexemeState(
  state: LearnerLexemeState,
  encounter: Encounter
): LearnerLexemeState
```

Prefer pure functions where possible.

---

# 12. `packages/lexical-engine`

Owns lexical analysis.

Responsibilities:

```text
token normalization
lemma lookup
chunk matching
frequency
lexical coverage
unknown-item detection
learning-value scoring
candidate vocabulary selection
```

Example:

```ts
interface LexicalCoverage {
  knownRatio: number;
  reviewRatio: number;
  unknownRatio: number;
  knownItems: string[];
  unknownItems: string[];
}
```

---

# 13. `packages/content-engine`

Owns content validation and difficulty analysis.

Responsibilities:

```text
validate generated stories
analyze lexical profile
check target items
check length
detect excessive unknown vocabulary
calculate learner-specific difficulty
prepare content metadata
```

It should not generate content directly.

Generation belongs to `packages/ai`.

---

# 14. `packages/ai`

Owns AI provider integration.

Responsibilities:

```text
LLM provider interface
NVIDIA NIM adapter
structured generation
prompt versions
retry policy
response validation
provider errors
```

Suggested structure:

```text
packages/ai/src/
├── providers/
│   ├── llm-provider.ts
│   └── nvidia-nim-provider.ts
├── prompts/
│   ├── story/
│   ├── tutor/
│   ├── placement/
│   └── vocabulary/
├── schemas/
└── errors/
```

---

# 15. `packages/speech`

Owns speech provider boundaries.

Responsibilities:

```text
ASR interface
TTS interface
Kokoro TTS adapter and NVIDIA ASR adapter
audio file metadata
speech errors
```

The rest of the system should not depend on provider-specific speech response objects.

---

# 16. `packages/db`

Owns SQLite persistence.

Responsibilities:

```text
connection lifecycle
schema
migrations
repository implementations
transactions
database health
```

Suggested structure:

```text
packages/db/src/
├── migrations/
├── repositories/
├── sqlite/
├── schema/
└── index.ts
```

---

# 17. `packages/config`

Owns runtime configuration.

Responsibilities:

```text
environment loading
schema validation
defaults
platform paths
feature flags
AI settings
speech settings
```

Example runtime config:

```ts
interface AppConfig {
  ai: {
    provider: 'nvidia-nim';
    baseUrl: string;
    apiKey?: string;
    model: string;
  };
  speech: {
    enabled: boolean;
  };
  learning: {
    dailyMinutes: number;
    newItemsPerSession: number;
  };
}
```

---

# 18. `packages/shared`

Only use `shared` for truly generic utilities.

Examples:

```text
date helpers
result types
IDs
small formatting utilities
```

Do not use `shared` as a dumping ground for domain logic.

---

# 19. TUI Architecture

The TUI is a presentation adapter.

It must not own business logic.

Suggested structure:

```text
apps/tui/src/
├── app/
│   ├── App.tsx
│   └── providers.tsx
├── navigation/
├── screens/
│   ├── HomeScreen.tsx
│   ├── OnboardingScreen.tsx
│   ├── PlacementScreen.tsx
│   ├── JourneyScreen.tsx
│   ├── StoryScreen.tsx
│   ├── ReviewScreen.tsx
│   ├── ProgressScreen.tsx
│   └── SettingsScreen.tsx
├── components/
│   ├── Layout.tsx
│   ├── Footer.tsx
│   ├── ProgressBar.tsx
│   ├── ChoiceList.tsx
│   └── ErrorPanel.tsx
└── hooks/
```

---

# 20. TUI State

TUI state should represent presentation state only.

Examples:

```text
selected menu item
current input
loading state
expanded help
active route
modal state
```

Do not store canonical learner state only inside React component state.

Canonical state belongs in repositories/domain services.

---

# 21. Navigation Model

The MVP can use an in-memory navigation state machine.

Example:

```text
SPLASH
  ↓
ONBOARDING
  ↓
PLACEMENT
  ↓
HOME
  ├── JOURNEY
  ├── REVIEW
  ├── STORY
  ├── PROGRESS
  └── SETTINGS
```

Navigation should remain explicit.

Avoid adding a heavy routing dependency unless needed.

---

# 22. Application Bootstrap

Suggested bootstrap flow:

```text
load configuration
      ↓
resolve data directory
      ↓
open database
      ↓
run migrations
      ↓
initialize repositories
      ↓
initialize AI provider
      ↓
initialize speech providers
      ↓
create application services
      ↓
start Ink application
```

Failure before TUI rendering should produce a readable terminal error.

---

# 23. Local Data Directory

Use platform-specific application directories.

Conceptually:

Linux:

```text
~/.local/share/gofluent/
```

Windows:

```text
%APPDATA%\GoFluent\
```

Avoid hardcoded paths.

Use a cross-platform directory resolver.

Possible contents:

```text
gofluent.db
cache/
audio/
logs/
config/
```

---

# 24. SQLite Schema

Initial tables may include:

```text
users
learner_profiles
lexemes
chunks
learner_lexeme_state
learner_chunk_state
encounters
review_queue
content
content_items
learning_sessions
session_events
learner_errors
settings
schema_migrations
```

---

# 25. Example: Learner Profile

Conceptual schema:

```text
learner_profiles

id
native_language
target_language
estimated_cefr
estimated_receptive_vocabulary
estimated_productive_vocabulary
created_at
updated_at
```

---

# 26. Example: Learner Lexeme State

Conceptual schema:

```text
learner_lexeme_state

learner_id
lexeme_id
encounters
heard_count
reading_recognition
listening_recognition
recall_score
productive_score
pronunciation_score
last_seen_at
next_review_at
updated_at
```

Composite uniqueness:

```text
learner_id + lexeme_id
```

---

# 27. Encounter Table

Conceptual schema:

```text
encounters

id
learner_id
item_type
item_id
modality
activity
result
assistance_used
session_id
created_at
```

Encounters should be append-oriented.

This table becomes the historical evidence layer.

---

# 28. Review Queue

Review state may either be derived dynamically or cached.

MVP can persist:

```text
item_id
item_type
learner_id
due_at
priority
last_result
```

The scheduler remains authoritative.

---

# 29. Session State

Learning session records should capture:

```text
session id
start time
end time
planned activities
completed activities
target items
new items
review items
session metrics
```

This helps resume or analyze sessions later.

---

# 30. Database Transactions

Use transactions for state changes that must remain consistent.

Example:

```text
submit recall result
      ↓
insert encounter
      ↓
update lexeme state
      ↓
schedule next review
      ↓
update session metrics
```

These writes should succeed or fail together.

---

# 31. Migration Strategy

Every schema change requires a migration.

Example:

```text
0001_initial.sql
0002_add_learner_errors.sql
0003_add_content_metadata.sql
```

Migrations must be ordered and idempotently tracked.

Never rely on destructive database reset in normal upgrades.

---

# 32. AI Provider Contract

Example interface:

```ts
export interface LLMProvider {
  generate<TOutput>(
    request: StructuredGenerationRequest<TOutput>
  ): Promise<TOutput>;
}
```

`StructuredGenerationRequest` should include:

```text
prompt version
system instructions
input data
output schema
generation options
```

---

# 33. NVIDIA NIM Adapter

The NIM adapter should translate domain-neutral requests into NVIDIA-compatible HTTP requests.

Responsibilities:

```text
authentication
base URL handling
model selection
timeouts
retry policy
stream parsing if used
error normalization
```

It should return provider-neutral output.

---

# 34. AI Error Types

Normalize provider failures.

Example:

```ts
type AIErrorCode =
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'NETWORK'
  | 'UNKNOWN';
```

The TUI should not need to understand raw HTTP errors.

---

# 35. Structured Generation

Prefer structured JSON outputs.

Example story schema:

```ts
const StorySchema = z.object({
  title: z.string(),
  text: z.string(),
  targetItems: z.array(z.string()),
  comprehensionQuestions: z.array(
    z.object({
      question: z.string(),
      expectedConcepts: z.array(z.string()),
    }),
  ),
});
```

Structured output is still untrusted until validated.

---

# 36. Two-Stage AI Validation

AI generation has two validation layers.

## Layer 1 — Structural Validation

Checks:

```text
valid JSON
required fields
correct types
field lengths
```

## Layer 2 — Domain Validation

Checks:

```text
lexical coverage
target-item presence
unknown vocabulary ratio
difficulty
pedagogical constraints
```

Passing schema validation alone is not enough.

---

# 37. Generate → Validate → Repair

Core content pipeline:

```text
learner context
      ↓
build prompt
      ↓
LLM generation
      ↓
schema validation
      ↓
lexical/domain validation
      ↓
valid?
   ┌──┴───┐
  yes     no
   │       │
   ▼       ▼
persist   repair/regenerate
   │
   ▼
present
```

Retry count must be bounded.

---

# 38. Prompt Versioning

Prompts are versioned independently from product releases.

Example:

```text
story/v1
story/v2
tutor/v1
placement/v1
```

Generated content metadata should ideally record:

```text
provider
model
prompt version
generation timestamp
```

This helps future debugging and evaluation.

---

# 39. Content Entity

Generated content should be persisted when useful.

Example metadata:

```text
id
type
title
text
topic
estimated_difficulty
known_ratio
unknown_ratio
prompt_version
model
created_at
```

This allows reuse offline and auditability.

---

# 40. Lexical Analysis Pipeline

Conceptual flow:

```text
raw text
   ↓
normalize
   ↓
tokenize
   ↓
identify lemmas
   ↓
detect chunks
   ↓
map known learner items
   ↓
calculate coverage
   ↓
identify unknown candidates
```

Chunk detection should occur before or alongside individual lexeme analysis to avoid losing phrase-level meaning.

---

# 41. Lexical Datasets

The architecture should allow lexical datasets to be imported or replaced.

Potential metadata:

```text
frequency rank
CEFR
part of speech
lemma
word forms
chunk frequency
```

Do not hardcode lexical knowledge inside prompts.

---

# 42. Learning Value Service

Example:

```ts
interface LearningValueService {
  score(
    item: LexicalItem,
    learner: LearnerProfile,
    context: LearningContext
  ): number;
}
```

Inputs may include:

```text
frequency
usefulness
interest relevance
upcoming content relevance
memory weakness
```

Keep weights configurable.

---

# 43. Memory / Review Engine

MVP scheduler should be simple and transparent.

Suggested contract:

```ts
interface ReviewScheduler {
  schedule(input: ReviewScheduleInput): ReviewScheduleResult;
}
```

Output:

```text
nextReviewAt
priority
reason
```

The scheduler should be testable without AI or database access.

---

# 44. Mastery Update Service

Mastery update logic should be deterministic.

Input:

```text
previous learner state
encounter
```

Output:

```text
new learner state
```

Different modalities should have different effects.

Example:

```text
reading recognition success
→ receptive increase

free spoken production success
→ productive increase
```

Do not let simple recognition heavily inflate productive mastery.

---

# 45. Placement Architecture

Placement is not intended to perfectly classify CEFR.

Its purpose is to bootstrap learner state.

Flow:

```text
self assessment
      ↓
adaptive lexical questions
      ↓
short comprehension
      ↓
optional listening
      ↓
optional production
      ↓
initial profile estimate
```

Placement output:

```text
estimated level
estimated receptive vocabulary
estimated productive vocabulary
initial known-item confidence
```

---

# 46. Daily Journey Planner

The planner is deterministic-first.

Inputs:

```text
review queue
learner profile
recent encounters
interests
target duration
recent errors
new-item budget
```

Output:

```text
JourneyPlan
```

Example:

```ts
interface JourneyPlan {
  reviewItems: LexicalItemId[];
  newItems: LexicalItemId[];
  targetChunks: ChunkId[];
  topic: string;
  activities: JourneyActivity[];
}
```

The LLM should not decide the entire plan.

---

# 47. Journey Activity Types

MVP activity types may include:

```text
REVIEW
STORY
LISTENING
RECALL
CONVERSATION
RECAP
```

Each activity should have explicit input and completion state.

---

# 48. Story Generation Architecture

Flow:

```text
JourneyPlan
   ↓
StoryGenerationRequest
   ↓
NIM
   ↓
StorySchema
   ↓
ContentEngine validation
   ↓
persist valid story
   ↓
TUI presentation
```

The story generator receives only the vocabulary necessary for the task.

---

# 49. Listening Architecture

For MVP:

```text
story text
   ↓
TTS provider
   ↓
audio artifact
   ↓
local cache
   ↓
playback
```

Audio cache key may incorporate:

```text
text hash
voice
speed
provider
```

---

# 50. Audio Playback Boundary

Define a local playback abstraction.

Example:

```ts
interface AudioPlayer {
  play(file: AudioFile): Promise<void>;
  stop(): Promise<void>;
}
```

Do not make learning-engine code aware of operating-system playback tools.

---

# 51. Speech-to-Text Architecture

Future/optional MVP flow:

```text
microphone capture
      ↓
temporary audio
      ↓
SpeechToTextProvider
      ↓
transcript
      ↓
conversation evaluator
```

Microphone capture is a platform-sensitive adapter and should be isolated.

---

# 52. Speak Mode Architecture

Conversation flow:

```text
scenario
   ↓
conversation context
   ↓
learner input
   ↓
ASR if spoken
   ↓
LLM interpretation
   ↓
response + feedback metadata
   ↓
encounter extraction
   ↓
persist evidence
```

Conversation should distinguish:

```text
tutor response
feedback
learner-state evidence
```

These are separate concerns.

---

# 53. Error Memory Architecture

After learner production:

```text
response
  ↓
analysis
  ↓
candidate errors
  ↓
validation / normalization
  ↓
error memory
```

Recurring errors should be aggregated.

Do not create a new unrelated error record for every wording variation when they represent the same pattern.

---

# 54. Error Categories

Potential categories:

```text
GRAMMAR
COLLOCATION
WORD_CHOICE
WORD_ORDER
PRONUNCIATION
SPELLING
MISSING_WORD
PHRASAL_VERB
ARTICLE
PREPOSITION
```

Categories may evolve.

---

# 55. Progress Metrics Architecture

Metrics should be derived from observed data where possible.

Examples:

```text
receptive repertoire
productive repertoire
review recall rate
listening minutes
reading words
speaking minutes
journeys completed
```

Estimated metrics:

```text
everyday comprehension %
CEFR
vocabulary size
```

must remain explicitly labeled as estimates.

---

# 56. Event Model

The MVP does not require an event bus.

However, domain events can be represented internally.

Example:

```text
EncounterRecorded
ReviewScheduled
StoryCompleted
JourneyCompleted
LexemeMasteryChanged
```

These may simply be typed objects passed within application services.

Do not introduce Kafka/RabbitMQ/etc.

---

# 57. Caching Strategy

Cache only where it materially helps.

Useful caches:

```text
generated audio
generated stories
lexical analysis
static vocabulary metadata
```

Avoid complex cache invalidation infrastructure.

Local filesystem cache is sufficient for MVP.

---

# 58. Offline Behavior

Without network access, GoFluent should still allow:

```text
view progress
view vocabulary
complete cached reviews
read cached stories
play cached audio
```

Unavailable actions should degrade gracefully.

Example:

```text
AI generation is unavailable while offline.
You can still complete 12 cached reviews.
```

---

# 59. Configuration Architecture

Configuration sources should have clear precedence.

Example:

```text
defaults
   ↓ overridden by
config file
   ↓ overridden by
environment variables
```

Secrets should prefer environment variables.

Config must be validated at startup.

---

# 60. Feature Flags

Possible feature flags:

```text
speech.enabled
speakMode.enabled
bossChallenges.enabled
learnFromAnything.enabled
```

Feature flags should be typed.

Avoid arbitrary string lookups throughout the codebase.

---

# 61. Logging Architecture

Use a small logging abstraction.

Example:

```ts
interface Logger {
  debug(message: string, context?: object): void;
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, context?: object): void;
}
```

Do not log:

```text
API keys
secrets
raw credentials
```

Full learner conversations should not be logged by default.

---

# 62. Error Taxonomy

Use domain-specific error types.

Categories:

```text
ConfigurationError
DatabaseError
AIProviderError
SpeechProviderError
ValidationError
LearningStateError
ContentGenerationError
NetworkError
```

Application layer converts these into presentation-friendly messages.

---

# 63. Result Types

Expected operational failures may use typed results.

Example:

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Do not use exceptions for every expected branch.

Use exceptions for truly exceptional failures where appropriate.

---

# 64. Concurrency Model

Node's async model is sufficient for MVP.

Potential concurrent tasks:

```text
AI request
database access
audio generation
audio playback
lexical analysis
```

Avoid blocking synchronous CPU-heavy loops in UI paths.

If lexical analysis becomes expensive, consider worker threads later.

Do not preemptively introduce workers.

---

# 65. TUI Responsiveness

All long-running operations must expose state.

Example:

```text
idle
loading
success
error
```

Never freeze the interface while waiting for NIM.

Cancellation should be considered for long AI operations in future iterations.

---

# 66. Terminal Rendering

Critical information must not rely on:

```text
emoji
color
advanced glyphs
```

Provide text or ASCII fallback.

Example:

```text
█████░░░
```

may degrade to:

```text
[#####---]
```

when needed.

---

# 67. Windows Compatibility

Special attention is required for:

```text
path handling
terminal ANSI behavior
keyboard events
audio playback
process spawning
application data paths
signals
```

Use Node APIs and platform adapters.

Avoid Bash dependencies in runtime behavior.

---

# 68. Linux Compatibility

Avoid assuming every Linux environment has:

```text
PulseAudio
PipeWire CLI tools
ffplay
aplay
specific shell utilities
```

Audio playback should use a documented adapter with fallbacks.

---

# 69. Packaging Architecture

Initial package execution:

```text
pnpm dev
```

User-facing target:

```text
gofluent
```

The package should expose a CLI binary.

Conceptually:

```json
{
  "bin": {
    "gofluent": "./dist/cli.js"
  }
}
```

Later releases may produce standalone binaries.

---

# 70. Build Architecture

Recommended build flow:

```text
TypeScript source
    ↓
typecheck
    ↓
compile/bundle
    ↓
CLI entry
```

Keep source maps in development builds.

Production output should preserve useful stack traces where practical.

---

# 71. Package Boundaries and Imports

Prefer package aliases:

```text
@gofluent/core
@gofluent/application
@gofluent/learning-engine
@gofluent/lexical-engine
@gofluent/content-engine
@gofluent/ai
@gofluent/db
```

Do not use deep relative imports across package boundaries.

Bad:

```ts
import { X } from '../../../../packages/core/src/...';
```

Good:

```ts
import { X } from '@gofluent/core';
```

---

# 72. Public Package API

Each internal package should expose a deliberate public API through `index.ts`.

Do not import arbitrary internal implementation files from other packages.

This reduces accidental coupling.

---

# 73. Dependency Injection

Provider and repository dependencies should be injected.

Example:

```ts
class GenerateStoryUseCase {
  constructor(
    private readonly llm: LLMProvider,
    private readonly contentValidator: ContentValidator,
    private readonly contentRepository: ContentRepository,
  ) {}
}
```

Avoid service locators and hidden global singletons.

---

# 74. Runtime Composition Root

Create dependencies in one composition root.

Likely:

```text
apps/tui/src/app/bootstrap.ts
```

It should assemble:

```text
config
logger
db
repositories
providers
engines
application services
```

The rest of the code should not instantiate infrastructure arbitrarily.

---

# 75. Research Policy as Code

Selected principles from `RESEARCH.md` should become constants/configuration.

Examples:

```ts
const DEFAULT_MAX_NEW_ITEM_RATIO = 0.05;
const DEFAULT_MIN_KNOWN_COVERAGE = 0.90;
const DEFAULT_MAX_KNOWN_COVERAGE = 0.95;
```

Avoid treating these numbers as immutable scientific truths.

They should be configurable and clearly documented as product defaults.

---

# 76. Pedagogical Constraints

Possible constraint object:

```ts
interface LearningPolicy {
  targetKnownCoverage: {
    min: number;
    max: number;
  };
  maxNewItemsPerJourney: number;
  maxImmediateCorrections: number;
  preferChunks: boolean;
  contextualReview: boolean;
}
```

This creates a bridge from research principles to executable behavior.

---

# 77. Architecture Decision Records

Significant decisions belong in:

```text
docs/adr/
```

Recommended initial ADRs:

```text
0001-react-ink-tui.md
0002-sqlite-local-first.md
0003-provider-independent-ai.md
0004-deterministic-review-scheduler.md
0005-encounter-driven-learner-model.md
0006-monorepo-package-boundaries.md
```

---

# 78. Testing Architecture

Testing layers:

```text
unit
integration
TUI
AI evals
manual cross-platform smoke tests
```

---

# 79. Unit Tests

Target pure logic:

```text
review scheduling
mastery updates
lexical coverage
learning-value scoring
difficulty scoring
session planning
content validation
```

These tests should be fast and deterministic.

---

# 80. Integration Tests

Target infrastructure boundaries:

```text
SQLite migrations
repositories
NIM adapter
configuration
story-generation pipeline
application services
```

External provider tests should use mock servers by default.

Live-provider tests should be opt-in.

---

# 81. TUI Tests

Test:

```text
screen rendering
keyboard navigation
loading states
error states
onboarding transitions
journey transitions
```

Avoid brittle snapshots for every terminal character.

Prefer behavioral assertions.

---

# 82. AI Evaluation Architecture

Maintain evaluation fixtures separately from unit tests.

Example:

```text
evals/story/beginner-001.json
evals/story/intermediate-001.json
evals/tutor/correction-001.json
```

Possible metrics:

```text
schema success
target vocabulary coverage
unknown ratio
response length
correction count
pedagogical compliance
```

---

# 83. Live AI Tests

Live NIM tests should not run on every local unit test command.

Use explicit command:

```text
pnpm test:ai:live
```

Require environment credentials.

Never fail standard unit tests because an external service is unavailable.

---

# 84. CI Architecture

Required jobs:

```text
lint
typecheck
unit tests
integration tests
build
```

Platform matrix:

```text
Ubuntu + Node 24
Windows + Node 24
```

Optional later:

```text
macOS
Node next LTS
```

---

# 85. Release Architecture

Release process:

```text
update version
      ↓
update CHANGELOG
      ↓
run tests
      ↓
run Linux CI
      ↓
run Windows CI
      ↓
build artifacts
      ↓
tag release
```

Tag format:

```text
v0.1.0
```

---

# 86. SemVer Interpretation

During `0.x`, architecture may still change.

However:

- compatible bug fixes → PATCH;
- new compatible functionality → MINOR;
- breaking changes must be documented;
- persisted learner data should be migrated safely.

Avoid casual breaking changes simply because version is under 1.0.

---

# 87. Observability

MVP observability is local.

Useful measurements:

```text
AI latency
AI failure rate
story validation failure rate
regeneration rate
DB latency
session completion
review success
```

A future cloud service may export metrics, but this is not required for MVP.

---

# 88. Security Boundaries

Trust boundaries include:

```text
environment variables
LLM output
speech transcripts
user input
future imported content
database file
filesystem paths
```

Never execute AI-generated code.

Never interpolate untrusted user input directly into shell commands.

---

# 89. Secrets

Secrets must remain outside version control.

Examples:

```text
NVIDIA_NIM_API_KEY
```

Configuration errors should not print full secret values.

---

# 90. Privacy Architecture

MVP should be local-first.

Persist locally:

```text
learner profile
progress
vocabulary state
encounters
errors
settings
```

Only send the minimum necessary context to external AI providers.

Do not send the entire learner database for every request.

---

# 91. Context Minimization

When generating a story, send:

```text
target words
review words
brief known-vocabulary summary
level
interests
constraints
```

Do not send thousands of known words unless necessary.

The content engine can validate output afterward.

---

# 92. Future Retrieval Architecture

Embeddings may later support:

```text
content matching
interest matching
similar sentence retrieval
error retrieval
review content selection
```

This should remain an optional infrastructure capability.

Do not add a vector database to the MVP without demonstrated need.

---

# 93. Future Learn From Anything

Future pipeline:

```text
user content
   ↓
parse
   ↓
lexical analysis
   ↓
difficulty estimate
   ↓
high-value vocabulary extraction
   ↓
lesson generation
   ↓
review integration
```

This feature should reuse existing lexical/content engines.

Do not build an isolated parallel learning system.

---

# 94. Future Web Client

A future web application should consume the same application/domain services.

The current architecture should make this possible by keeping Ink-specific behavior inside `apps/tui`.

Potential future structure:

```text
apps/
├── tui/
└── web/
```

---

# 95. Future Cloud Sync

Cloud sync may later introduce:

```text
remote identity
remote persistence
sync protocol
conflict resolution
```

Local repositories should therefore be abstracted, but no sync complexity is required now.

---

# 96. Future Multi-Language Support

The MVP targets English.

Avoid hardcoding English-specific assumptions where a small abstraction is easy.

However, do not generalize every domain prematurely.

A reasonable approach:

```text
targetLanguage = 'en'
nativeLanguage = 'pt-BR'
```

with typed language codes.

---

# 97. Architecture Anti-Patterns

Do not introduce:

```text
business logic in React components
database calls directly from screens
NVIDIA API types in domain entities
LLM-decided review dates
LLM-decided mastery state
giant all-purpose service classes
global mutable learner state
cross-package deep imports
Linux-only shell assumptions
hardcoded user data paths
unbounded AI retries
unvalidated structured output
```

---

# 98. Example End-to-End Flow: Daily Journey

```text
User selects "Start Journey"
      ↓
TUI calls StartDailyJourney use case
      ↓
application loads learner profile
      ↓
application loads due reviews
      ↓
learning engine creates JourneyPlan
      ↓
story activity requires content
      ↓
application calls GenerateAdaptiveStory
      ↓
AI package calls NIM
      ↓
response is schema validated
      ↓
content engine checks lexical coverage
      ↓
valid content is persisted
      ↓
TUI renders activity
      ↓
learner answers
      ↓
application records Encounter
      ↓
learning engine updates mastery
      ↓
review scheduler calculates next review
      ↓
transaction persists state
      ↓
Journey advances
```

---

# 99. Example End-to-End Flow: Recall

```text
Review item shown
      ↓
learner responds
      ↓
response evaluated
      ↓
Encounter created
      ↓
mastery state updated
      ↓
next review calculated
      ↓
all changes persisted transactionally
      ↓
UI shows concise feedback
```

The LLM may help interpret an open-ended response, but it does not directly set mastery.

---

# 100. Example End-to-End Flow: Story Validation

```text
target vocabulary
known coverage target
interest
      ↓
prompt
      ↓
NIM
      ↓
structured story
      ↓
Zod
      ↓
lexical analysis
      ↓
coverage = 92%
targets present = yes
unknown ratio = acceptable
      ↓
persist
      ↓
display
```

If:

```text
unknown ratio = 24%
```

then:

```text
reject and repair/regenerate
```

---

# 101. Architecture Quality Criteria

A good architecture change should improve at least one of:

```text
testability
clarity
cross-platform reliability
learner-state correctness
provider independence
pedagogical compliance
maintainability
failure isolation
```

without unnecessary complexity.

---

# 102. MVP Architecture Acceptance Criteria

The architecture is considered viable for `0.1.0` when:

- [ ] TUI runs on Linux.
- [ ] TUI runs on Windows.
- [ ] Application bootstrap succeeds from a clean install.
- [ ] SQLite migrations run automatically.
- [ ] Learner profile persists.
- [ ] Lexical states persist.
- [ ] Encounters persist.
- [ ] Review scheduling is deterministic.
- [ ] Daily Journey is generated from structured state.
- [ ] NIM provider is isolated behind an interface.
- [ ] Generated stories are schema validated.
- [ ] Generated stories are lexically validated.
- [ ] Invalid content is rejected or repaired.
- [ ] TUI does not directly call SQLite.
- [ ] TUI does not directly call NVIDIA APIs.
- [ ] Domain logic has no Ink dependency.
- [ ] Required unit tests pass.
- [ ] Required integration tests pass.
- [ ] CI passes on Linux and Windows.
- [ ] Configuration rejects missing/invalid required values clearly.
- [ ] Secrets are not committed.
- [ ] Data migrations preserve learner progress.

---

# 103. Architecture Evolution Strategy

Architecture should evolve incrementally.

For each proposed change:

```text
1. Identify the actual product problem.
2. Check RESEARCH.md.
3. Check PRD.md.
4. Prefer extension of existing boundaries.
5. Avoid parallel subsystems.
6. Add ADR if significant.
7. Add tests.
8. Preserve learner data.
```

---

# 104. Initial Architecture Decisions Summary

```text
Monorepo                  Yes
Runtime                   Node.js 24 LTS
Language                  TypeScript
UI                        React + Ink
Primary client            TUI
Required OS               Linux + Windows
Persistence               SQLite
Architecture style        Modular monolith
AI                        NVIDIA NIM
AI abstraction            Required
Speech abstraction        Required
Review engine             Deterministic
Learner model             Encounter-driven
Generated content         Validated
Prompts                    Versioned
Package boundaries         Explicit
CI                         Ubuntu + Windows
Versioning                 SemVer 2.0.0
```

---

# 105. Final Architecture Principle

GoFluent should remain a **modular local-first learning system**, not an infrastructure project.

The architecture should make the most important learning loop reliable:

```text
learner state
      ↓
better input
      ↓
meaningful encounter
      ↓
evidence
      ↓
memory update
      ↓
better next input
```

The system succeeds when architecture reinforces this feedback loop.

The architecture fails if AI generation becomes the center of the product while learner state, validation, memory, and pedagogy become secondary.

The learner model is the core.

The LLM is a tool around that core.
