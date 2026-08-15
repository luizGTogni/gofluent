# GoFluent — Product Requirements Document

> **Product:** GoFluent  
> **Document:** PRD.md  
> **Initial Product Version:** `0.1.0`  
> **Status:** Draft for MVP implementation  
> **Primary Runtime:** Node.js 24 LTS  
> **Language:** TypeScript  
> **Primary Interface:** Cross-platform TUI for Linux and Windows  
> **AI Platform for MVP:** NVIDIA NIM  
> **Versioning:** Semantic Versioning 2.0.0  
> **Pedagogical Source of Truth:** `RESEARCH.md`

---

# 1. Product Vision

GoFluent is an AI-powered English acquisition system focused on helping learners progressively understand and use real English.

The product is not intended to be a traditional grammar course delivered through a chatbot.

Its core promise is:

> **Everything the learner consumes should adapt to what they already know, and important vocabulary should keep reappearing until it becomes usable English.**

GoFluent should continuously model the learner's vocabulary, comprehension, memory, interests, and recurring errors in order to select or generate the best next learning experience.

The MVP will be delivered as a terminal user interface (TUI) that works on Linux and Windows.

The initial implementation will use:

- Node.js;
- TypeScript;
- React;
- Ink;
- NVIDIA NIM-compatible APIs;
- local persistence for the first MVP;
- a modular architecture that can later support a remote backend, web application, mobile application, and multiple language providers.

---

# 2. Pedagogical Contract

`RESEARCH.md` is the pedagogical source of truth for GoFluent.

Every feature, algorithm, exercise, and product decision SHOULD be evaluated against the principles established in `RESEARCH.md`.

When product convenience conflicts with the learning principles in `RESEARCH.md`, the implementation SHOULD prefer the research-backed learning behavior unless a product decision explicitly documents the trade-off.

## 2.1 Core Rules

The MVP MUST follow these rules:

1. Vocabulary and useful lexical chunks are primary learning units.
2. Grammar MUST NOT be the main curriculum navigation system.
3. Important vocabulary SHOULD appear multiple times across different contexts.
4. Learning SHOULD combine input, retrieval, production, and re-exposure.
5. Audio MUST be treated as a first-class learning modality.
6. Content difficulty SHOULD adapt to the learner.
7. New vocabulary SHOULD be introduced in meaningful context whenever possible.
8. The system SHOULD distinguish receptive knowledge from productive knowledge.
9. Spaced repetition SHOULD be contextual whenever practical.
10. Gamification SHOULD represent meaningful competence, not arbitrary clicking.
11. The LLM MUST NOT be treated as the source of truth for learner state.
12. Persistent structured data MUST track vocabulary state, progress, errors, and review timing.
13. The product SHOULD gradually move learners from assisted learning toward independent immersion.
14. The amount of unknown language presented at once SHOULD remain controlled.
15. The system SHOULD prefer high-value vocabulary over rare low-impact vocabulary.

---

# 3. Product Goals

The MVP exists to validate the following hypothesis:

> A system that explicitly models the learner's lexical state can generate better learning material, recycle the right language at the right time, and produce measurable gains in comprehension.

## 3.1 Primary Goals

The MVP MUST allow a user to:

- start from zero or limited English;
- complete an initial level and vocabulary assessment;
- maintain a persistent learner profile;
- receive an adaptive daily learning session;
- read short adaptive stories;
- listen to generated or supplied audio;
- learn useful vocabulary and chunks from context;
- review vocabulary using spaced repetition;
- speak or type answers to an AI tutor;
- receive concise feedback;
- track receptive and active vocabulary separately;
- track learning progress over time;
- resume learning after closing the application;
- use the application on Linux and Windows.

## 3.2 Secondary Goals

The MVP SHOULD:

- personalize lessons around learner interests;
- track recurring learner errors;
- select vocabulary based on learning value;
- adapt content based on known vocabulary;
- expose the learner to listening without transcript before revealing text;
- support a lightweight game/progression layer;
- provide visible learning metrics;
- prepare an architecture for future real-world content ingestion.

## 3.3 Non-Goals for MVP

The initial MVP will NOT attempt to provide:

- a mobile app;
- a browser UI;
- a social network;
- multiplayer learning;
- teacher dashboards;
- advanced pronunciation scoring;
- real-time speech-to-speech conversation;
- automatic ingestion of copyrighted streaming services;
- direct Netflix integration;
- a large fixed lesson catalog;
- dozens of game modes;
- multiple target languages;
- fine-tuned custom models;
- sophisticated cloud synchronization;
- full offline AI inference.

These may be considered after the MVP validates the core learning loop.

---

# 4. Target Users

GoFluent should support multiple stages of English proficiency.

## 4.1 Persona A — Absolute Beginner

Approximate lexical state:

```text
0–500 useful words/chunks
```

Needs:

- concrete vocabulary;
- simple sentences;
- visual/contextual explanations when available;
- slow audio;
- repetition;
- translation assistance on demand;
- extremely controlled content difficulty.

The system SHOULD avoid long grammar explanations.

---

## 4.2 Persona B — Beginner With Some Base

Approximate lexical state:

```text
500–2,000 useful words/chunks
```

Needs:

- short stories;
- listening practice;
- high-frequency phrases;
- phrasal verbs;
- daily situations;
- guided speaking;
- vocabulary recycling.

---

## 4.3 Persona C — Intermediate Learner

Approximate lexical state:

```text
2,000–5,000+ useful words/chunks
```

Needs:

- authentic-like content;
- learner-interest-based topics;
- more listening without transcript;
- collocations;
- chunks;
- conversational fluency;
- professional vocabulary;
- real-world content preparation.

---

## 4.4 Persona D — Advanced Learner

Needs:

- nuance;
- idioms;
- natural phrasing;
- varied accents;
- speed;
- advanced listening;
- professional and academic vocabulary;
- error refinement;
- conversation practice.

Advanced learners are not the primary MVP target.

The MVP MUST primarily optimize for Personas A–C.

---

# 5. Core Product Loop

The primary learning loop is:

```text
DISCOVER
   ↓
UNDERSTAND
   ↓
NOTICE
   ↓
RECALL
   ↓
USE
   ↓
RE-ENCOUNTER
   ↓
MASTER
```

Every major learning feature SHOULD support one or more stages in this cycle.

The ideal Daily Journey should include all seven over time.

---

# 6. MVP User Experience

The product runs from the terminal.

Example:

```bash
gofluent
```

The application opens a full-screen interactive terminal interface.

Example conceptual home screen:

```text
┌─────────────────────────────────────────────────────────────┐
│ GoFluent                                           v0.1.0  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Good evening, Alex.                                         │
│                                                             │
│ Everyday English comprehension estimate: 42%                │
│                                                             │
│ Receptive repertoire        812                              │
│ Active repertoire           347                              │
│ Reviews due                 14                               │
│                                                             │
│ Today's Journey                                             │
│ ─────────────────────────────────────────────────────────── │
│ 1. Review        4 min                                      │
│ 2. Story         5 min                                      │
│ 3. Listening     4 min                                      │
│ 4. Speak         4 min                                      │
│ 5. Recap         2 min                                      │
│                                                             │
│ [Enter] Start Journey                                       │
│ [R] Review   [S] Story   [P] Progress   [Q] Quit            │
└─────────────────────────────────────────────────────────────┘
```

The interface MUST remain usable using only a keyboard.

Mouse support is optional.

---

# 7. TUI Requirements

## 7.1 Technology

The initial TUI SHOULD use:

```text
React
+
Ink
+
TypeScript
```

Reasons:

- reusable component model;
- predictable state-driven UI;
- strong TypeScript ecosystem;
- terminal-focused rendering;
- supports interactive CLI applications;
- one Node-based codebase for Linux and Windows.

## 7.2 Supported Platforms

MVP support:

```text
Linux x64
Windows x64
```

Best-effort support may also work on:

```text
Linux ARM64
Windows ARM64
macOS
```

but these are not required release targets for `0.1.x`.

## 7.3 Terminal Requirements

The application SHOULD work in commonly used modern terminals.

Linux examples:

- GNOME Terminal;
- Konsole;
- Kitty;
- Alacritty;
- WezTerm;
- standard terminal environments with ANSI support.

Windows examples:

- Windows Terminal;
- PowerShell terminal;
- modern Command Prompt environments with ANSI support.

## 7.4 Terminal Capability Detection

The application SHOULD detect:

- terminal width;
- terminal height;
- color support;
- Unicode support where possible;
- interactive vs non-interactive execution.

The interface SHOULD gracefully degrade when rich Unicode or color is not available.

No critical information may depend exclusively on color.

## 7.5 Minimum Terminal Size

Recommended minimum:

```text
80 columns × 24 rows
```

If the terminal is smaller, the application SHOULD show a compact layout or a resize notice.

---

# 8. Main Navigation

MVP navigation:

```text
Home
├── Daily Journey
├── Review
├── Story
├── Speak
├── Progress
├── Vocabulary
└── Settings
```

Future navigation:

```text
Learn From Anything
Immersion
Media Prep
Worlds
Challenges
```

---

# 9. Onboarding

First launch MUST trigger onboarding.

## 9.1 Step 1 — Welcome

Explain the product in one short message.

Example:

```text
GoFluent learns what English you already know
and adapts every session around you.
```

## 9.2 Step 2 — Native Language

MVP:

```text
Portuguese (Brazil)
```

Architecture MUST allow future localization.

## 9.3 Step 3 — Goals

Options:

```text
[ ] Understand movies and series
[ ] Speak confidently
[ ] Work in English
[ ] Travel
[ ] Read books and articles
[ ] Technology / programming
[ ] General English
```

Multiple selections allowed.

## 9.4 Step 4 — Interests

Examples:

```text
Technology
Games
Business
Science
Movies
Music
Travel
History
Sports
Custom...
```

Interests influence generated content.

## 9.5 Step 5 — Self-Assessment

Question:

```text
How much English do you already know?

1. Almost nothing
2. A little
3. I understand simple English
4. I can have basic conversations
5. Intermediate
6. Advanced
```

## 9.6 Step 6 — Adaptive Placement

The system runs a short adaptive assessment.

The assessment SHOULD test:

- common vocabulary recognition;
- short phrase comprehension;
- basic listening if audio is configured;
- sentence comprehension;
- optional short production.

It MUST NOT attempt to perfectly identify CEFR.

Its main objective is to initialize the lexical model.

## 9.7 Step 7 — Initial Profile

The application produces an estimated starting state:

```text
Estimated level: A1

Estimated receptive vocabulary: ~640
Estimated active vocabulary: ~240

Recommended starting path:
Everyday English — Foundation
```

All values must be presented as estimates.

---

# 10. Daily Journey

Daily Journey is the primary MVP experience.

Default target length:

```text
15–20 minutes
```

Structure:

```text
Warm-Up Review
      ↓
Adaptive Story
      ↓
Listening
      ↓
Active Recall
      ↓
Conversation
      ↓
Recap
```

## 10.1 Session Planner

The planner chooses:

```text
review_items
new_items
target_chunks
story_topic
listening_targets
speaking_targets
```

Inputs:

```text
learner profile
known vocabulary
review schedule
interests
recent content
recent mistakes
difficulty target
session duration
```

Output MUST be structured data.

The LLM MUST NOT independently control the session state.

---

# 11. Vocabulary Model

Vocabulary is the central domain entity.

The MVP SHOULD distinguish:

```text
Lexeme
Chunk
LearnerLexemeState
LearnerChunkState
Encounter
```

## 11.1 Lexeme

Example:

```json
{
  "id": "lex_actually",
  "lemma": "actually",
  "partOfSpeech": "adverb",
  "frequencyRank": 487,
  "cefr": "A2"
}
```

## 11.2 Chunk

Example:

```json
{
  "id": "chunk_look_forward_to",
  "text": "look forward to",
  "type": "expression",
  "cefr": "B1"
}
```

## 11.3 Learner State

Example:

```json
{
  "lexemeId": "lex_actually",
  "encounters": 17,
  "heardCount": 9,
  "readingRecognition": 0.92,
  "listeningRecognition": 0.71,
  "recallScore": 0.83,
  "productiveScore": 0.42,
  "pronunciationScore": null,
  "lastSeenAt": "2026-08-14T18:00:00Z",
  "nextReviewAt": "2026-08-17T18:00:00Z"
}
```

Scores SHOULD use:

```text
0.0 → 1.0
```

They represent model confidence, not precise scientific measurement.

---

# 12. Vocabulary Mastery States

User-facing states:

```text
NEW
FAMILIAR
RECOGNIZED
UNDERSTOOD
RECALLABLE
USABLE
AUTOMATIC
```

Internal score thresholds may evolve.

The MVP SHOULD primarily use continuous scores internally.

---

# 13. Receptive vs Productive Knowledge

The system MUST track receptive and productive knowledge separately.

Example:

```text
Receptive vocabulary: 1,420
Active vocabulary:      680
```

Receptive evidence includes:

- correct meaning recognition;
- reading comprehension;
- listening recognition.

Productive evidence includes:

- correct free recall;
- correct typed usage;
- correct spoken usage;
- successful spontaneous use in conversation.

---

# 14. Encounter System

Every meaningful interaction with a lexical item SHOULD create an Encounter.

Example:

```json
{
  "learnerId": "user_1",
  "itemId": "chunk_figure_out",
  "modality": "LISTENING",
  "activity": "STORY",
  "result": "SUCCESS",
  "assistanceUsed": false,
  "timestamp": "..."
}
```

Possible modalities:

```text
READING
LISTENING
RECALL
WRITING
SPEAKING
```

Possible outcomes:

```text
SUCCESS
PARTIAL
FAIL
SKIPPED
```

This historical stream powers personalization.

---

# 15. Spaced Review Engine

The MVP requires a review scheduler.

The first implementation SHOULD be deterministic and simple.

It MAY later use more advanced memory models such as FSRS-inspired scheduling.

The MVP scheduler should consider:

```text
time since encounter
previous recall success
number of encounters
receptive score
productive score
importance
difficulty
```

Conceptual formula:

```text
review_priority =
memory_weakness
× learning_value
× overdue_factor
```

The LLM MUST NOT decide review dates.

---

# 16. Contextual Review

The application SHOULD avoid excessive isolated flashcards.

Preferred review types:

```text
Meaning in context
Sentence completion
Audio recognition
Cloze
Short translation only when useful
Choose the natural phrase
Free recall
Mini dialogue
Short production
```

Example:

```text
Yesterday:
figure out = introduced

Today:
"I couldn't ______ how the machine worked."

Later:
AI: "How did you figure out the solution?"
```

---

# 17. Vocabulary Learning Value

Not every unknown word deserves equal attention.

The system SHOULD estimate:

```text
Learning Value =
general_frequency
× contextual_usefulness
× learner_interest
× upcoming_content_relevance
× memory_need
```

The exact formula is implementation-specific and may change during `0.x`.

The system SHOULD strongly prefer:

- high-frequency words;
- reusable chunks;
- important connectors;
- common phrasal verbs;
- vocabulary relevant to learner goals.

---

# 18. Adaptive Story

Story is the main comprehensible-input feature.

## 18.1 Inputs

Story generator receives:

```json
{
  "knownItems": [],
  "reviewItems": [],
  "newItems": [],
  "avoidItems": [],
  "interests": [],
  "targetDifficulty": 0.0,
  "maxWords": 0
}
```

## 18.2 Target Profile

Default target:

```text
Known language: 90–95%
Review language: 3–8%
New language: 2–5%
```

Values can adapt by level.

## 18.3 Generation Contract

The generated story MUST:

- be coherent;
- be interesting;
- fit learner interests when possible;
- naturally contain review items;
- naturally introduce new items;
- avoid excessive unknown language;
- be age-neutral and broadly appropriate;
- avoid artificial keyword stuffing.

## 18.4 Backend Validation

After generation, the backend MUST analyze:

```text
tokenized words
known lexemes
unknown lexemes
target chunks
coverage
length
```

If constraints are violated beyond tolerance:

```text
reject
  ↓
regenerate or repair
```

The LLM is the generator.

The backend is the validator.

---

# 19. Story Learning Flow

Recommended MVP flow:

```text
1. Listen first
2. Answer one comprehension question
3. Reveal text
4. Read
5. Highlight target language
6. Explain selected items
7. Listen again
8. Answer comprehension
9. Retell briefly
```

Learners may skip audio if audio is not configured.

---

# 20. Listening

Audio is mandatory as a product capability even if speech features are initially opt-in while the local TTS model is unavailable.

Listening modes:

```text
Normal
Slow
Sentence-by-sentence
With transcript
Without transcript
Replay sentence
```

Future modes:

```text
Dictation
Shadowing
Accent practice
```

---

# 21. Text-to-Speech

TTS provider abstraction:

```ts
interface TextToSpeechProvider {
  synthesize(input: TTSRequest): Promise<TTSResult>;
}
```

Initial provider:

```text
Kokoro, running locally
```

The rest of the application MUST NOT depend directly on Kokoro-specific model or inference objects.

This allows future providers.

---

# 22. Speech-to-Text

ASR provider abstraction:

```ts
interface SpeechToTextProvider {
  transcribe(input: AudioInput): Promise<TranscriptResult>;
}
```

Initial provider:

```text
NVIDIA Speech NIM
```

The application SHOULD support text-only mode when ASR is unavailable.

---

# 23. Speak Mode

Speak provides guided conversation.

MVP supports:

```text
typed conversation
+
optional microphone conversation
```

The AI tutor receives:

```text
learner level
known vocabulary summary
target vocabulary
conversation scenario
recent recurring errors
```

The AI SHOULD:

- speak near the learner's level;
- encourage target vocabulary naturally;
- avoid correcting every mistake immediately;
- maintain conversation flow;
- keep responses relatively short for beginners.

---

# 24. Conversation Feedback

After a conversation turn or short session, the system may show:

```text
Good:
✓ "I want to..."
✓ correct use of "because"

Try this:
"I did a mistake"
→ "I made a mistake"

New phrase:
"figure it out"
```

The system SHOULD prioritize a few useful corrections.

It SHOULD NOT produce overwhelming error dumps.

---

# 25. Error Memory

Recurring errors SHOULD be stored.

Example:

```json
{
  "category": "COLLOCATION",
  "original": "do a mistake",
  "preferred": "make a mistake",
  "count": 4,
  "lastSeenAt": "..."
}
```

Future lessons may intentionally create opportunities to correct the pattern.

---

# 26. Grammar

Grammar exists as a supporting feature.

The MVP SHOULD use grammar primarily for:

- explanation;
- correction;
- pattern discovery;
- answering learner questions.

The home screen MUST NOT be structured as:

```text
Present Simple
Past Simple
Present Perfect
...
```

A preferred interaction:

```text
Pattern noticed:

You've seen:
"I've never..."
"Have you ever..."
"I've already..."

Want a short explanation?
```

---

# 27. Progress

The Progress screen SHOULD show meaningful metrics.

Example:

```text
┌──────────────────────────────────────────────────────┐
│ Progress                                             │
├──────────────────────────────────────────────────────┤
│ Estimated everyday comprehension       42%           │
│                                                      │
│ Receptive repertoire                    812           │
│ Active repertoire                       347           │
│                                                      │
│ Listening                            █████░░░ 46%      │
│ Reading                              ██████░░ 61%      │
│ Speaking                             ███░░░░░ 31%      │
│ Writing                              ████░░░░ 38%      │
│                                                      │
│ This week                                            │
│ Listening                             1h 14m          │
│ Words read                            8,420           │
│ Speaking                                26m           │
└──────────────────────────────────────────────────────┘
```

All comprehension percentages MUST be labeled as estimates.

---

# 28. Gamification

MVP gamification SHOULD remain lightweight.

Supported mechanics:

```text
streak
daily journey completion
repertoire growth
topic/world mastery
boss challenge completion
personal bests
```

XP MAY exist but MUST NOT be the main product metric.

---

# 29. Learning Worlds

MVP may include the first three worlds:

```text
Everyday Life
Travel
Technology
```

Each world provides:

```text
core vocabulary
chunks
stories
conversation scenarios
progress
```

Future worlds:

```text
Food
Work
Friends
Games
Entertainment
Culture
Ideas
Science
Business
```

---

# 30. Boss Challenge

A boss challenge evaluates communication in a realistic scenario.

Example:

```text
Airport Check-In
```

The user needs to interact successfully using relevant vocabulary.

The system SHOULD evaluate:

- task completion;
- comprehension;
- target phrase usage;
- ability to continue communication.

It SHOULD NOT require perfect grammar.

Boss challenges may be added after the core `0.1.0` flow if schedule requires.

---

# 31. Local Persistence

The first MVP SHOULD support local-first user state.

Recommended:

```text
SQLite
```

Reasons:

- single local database file;
- reliable persistence;
- cross-platform;
- easy inspection and migration;
- no server required for first-run MVP.

Data directory SHOULD use platform-standard application data directories.

Conceptually:

Linux:

```text
~/.local/share/gofluent/
```

Windows:

```text
%APPDATA%\GoFluent\
```

Exact resolution SHOULD use a cross-platform library or Node platform APIs.

---

# 32. Database Entities

Initial entities:

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
sessions
session_events
learner_errors
settings
schema_migrations
```

---

# 33. Repository Architecture

Recommended monorepo:

```text
gofluent/
│
├── apps/
│   └── tui/
│
├── packages/
│   ├── core/
│   ├── learning-engine/
│   ├── lexical-engine/
│   ├── content-engine/
│   ├── ai/
│   ├── speech/
│   ├── db/
│   ├── config/
│   └── shared/
│
├── research/
│   └── RESEARCH.md
│
├── PRD.md
├── package.json
├── tsconfig.json
└── README.md
```

If the existing project keeps `RESEARCH.md` at repository root, that is also acceptable.

The important rule is that both:

```text
RESEARCH.md
PRD.md
```

remain version-controlled.

---

# 34. Package Responsibilities

## `apps/tui`

Contains:

- Ink application;
- screens;
- keyboard navigation;
- rendering;
- user interactions.

It SHOULD NOT contain learning algorithms.

## `packages/core`

Contains:

- domain types;
- shared business rules;
- core interfaces.

## `packages/learning-engine`

Contains:

- session planning;
- Daily Journey;
- learner state transitions;
- mastery updates.

## `packages/lexical-engine`

Contains:

- vocabulary lookup;
- frequency data;
- lexical coverage;
- learning value;
- chunk management.

## `packages/content-engine`

Contains:

- story validation;
- content difficulty;
- token analysis;
- generated content metadata.

## `packages/ai`

Contains:

- NIM LLM client;
- structured generation;
- prompt templates;
- provider abstraction.

## `packages/speech`

Contains:

- ASR abstraction;
- TTS abstraction;
- local Kokoro TTS adapter.

## `packages/db`

Contains:

- SQLite;
- migrations;
- repositories;
- query layer.

## `packages/config`

Contains:

- environment variables;
- configuration loading;
- validation.

---

# 35. TypeScript Policy

The project MUST use TypeScript with strict mode enabled.

Recommended baseline:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Avoid widespread:

```ts
any
```

External AI responses MUST be runtime validated.

---

# 36. Runtime Validation

LLM output is untrusted external input.

Structured responses SHOULD be validated using a schema library.

Example approach:

```text
Zod
```

Conceptual flow:

```text
NIM response
   ↓
JSON parse
   ↓
Schema validation
   ↓
Domain validation
   ↓
Accept or retry
```

Never update learner state directly from unvalidated model output.

---

# 37. AI Provider Architecture

Define an abstraction:

```ts
interface LLMProvider {
  generate<T>(
    request: StructuredGenerationRequest<T>
  ): Promise<T>;
}
```

Initial implementation:

```text
NvidiaNimProvider
```

Future implementations may include other compatible providers.

Product domain logic MUST NOT depend on NVIDIA-specific response structures.

---

# 38. NVIDIA NIM

NVIDIA NIM is the preferred MVP AI provider.

The implementation SHOULD support configuration such as:

```text
NVIDIA_NIM_BASE_URL
NVIDIA_NIM_API_KEY
NVIDIA_NIM_MODEL
```

Secrets MUST NOT be stored in source control.

The application SHOULD support:

```text
.env
environment variables
future secure credential storage
```

---

# 39. Prompt Architecture

Prompts SHOULD be versioned files.

Example:

```text
prompts/
├── story/
│   └── v1.ts
├── tutor/
│   └── v1.ts
├── assessment/
│   └── v1.ts
└── vocabulary/
    └── v1.ts
```

Prompts MUST request structured output wherever practical.

Prompts SHOULD reference pedagogical rules derived from `RESEARCH.md`.

---

# 40. Research Compliance in Code

Important pedagogical constraints SHOULD become executable rules where possible.

Examples:

```ts
MAX_NEW_ITEM_RATIO
TARGET_KNOWN_COVERAGE
MAX_IMMEDIATE_CORRECTIONS
MIN_REENCOUNTERS_FOR_MASTERY
```

This prevents the principles from existing only in documentation.

A future `research-policy` module MAY expose these constraints.

---

# 41. Content Validation

Generated content MUST pass validation before reaching the learner.

Validation includes:

```text
schema validation
length check
lexical coverage check
target-item presence
unknown vocabulary ratio
duplicate detection
basic safety checks
```

The system SHOULD retry generation when validation fails.

---

# 42. Offline Behavior

The MVP requires network access for AI generation unless locally hosted NIM endpoints are configured.

However, the application SHOULD remain usable offline for:

- viewing progress;
- inspecting vocabulary;
- completing already-generated review items;
- reading cached stories;
- accessing cached audio if stored.

The UI MUST clearly communicate network failures.

---

# 43. Error Handling

Errors SHOULD be user-friendly.

Bad:

```text
ECONNRESET
```

Better:

```text
GoFluent could not reach the AI service.

[R] Retry
[H] Go Home
[D] Show technical details
```

Technical details SHOULD remain available for developers.

---

# 44. Logging

The application SHOULD support structured logs.

Default user mode:

```text
minimal
```

Development mode:

```text
debug
```

Logs MUST NOT include:

- API keys;
- secrets;
- raw credentials.

Care should be taken before logging learner conversations.

---

# 45. Configuration

Potential config:

```yaml
language:
  native: pt-BR
  target: en

learning:
  dailyMinutes: 20
  newItemsPerSession: 5

ai:
  provider: nvidia-nim
  model: configured-model

speech:
  enabled: true
```

Actual format MAY be JSON, YAML, or environment-backed configuration.

Keep the initial configuration simple.

---

# 46. Packaging

The CLI command SHOULD be:

```bash
gofluent
```

Development:

```bash
pnpm dev
```

or equivalent.

MVP packaging SHOULD aim for:

```text
npm package
```

and, later:

```text
standalone release artifacts
```

for Linux and Windows.

The project SHOULD avoid requiring users to compile native dependencies when possible.

---

# 47. Package Manager

Recommended:

```text
pnpm
```

with workspaces.

Alternative:

```text
npm workspaces
```

The final choice is an implementation decision.

The repository MUST have a committed lockfile.

---

# 48. Node.js Baseline

Initial supported runtime:

```text
Node.js 24 LTS
```

The project SHOULD define this explicitly using:

```text
package.json engines
```

and optionally:

```text
.nvmrc
.node-version
```

The project MAY later support newer LTS versions after CI validation.

---

# 49. Testing Strategy

The MVP MUST include automated tests for the learning-critical logic.

## Unit Tests

Required for:

```text
mastery calculations
review scheduling
lexical coverage
learning-value scoring
content validation
state transitions
SemVer helpers if implemented
```

## Integration Tests

Required for:

```text
database repositories
NIM provider adapter
structured-output validation
session planner
```

## TUI Tests

Should cover:

```text
main navigation
onboarding
Daily Journey
error states
keyboard shortcuts
```

## Golden/Fixture Tests

Useful for:

```text
lexical analysis
story validation
prompt parsing
LLM structured responses
```

---

# 50. AI Evaluation

LLM behavior cannot be reliably tested only with standard unit tests.

Maintain evaluation cases.

Example:

```text
evals/
├── beginner-story.json
├── vocabulary-explanation.json
├── tutor-correction.json
└── placement-test.json
```

Each eval SHOULD verify:

- schema compliance;
- lexical constraints;
- appropriate difficulty;
- target vocabulary usage;
- excessive correction avoidance.

---

# 51. Cross-Platform CI

CI SHOULD test at minimum:

```text
Ubuntu
Windows
```

Recommended matrix:

```text
Node 24
Ubuntu latest
Windows latest
```

Before a release, tests MUST pass on both required platforms.

---

# 52. Semantic Versioning

GoFluent MUST follow Semantic Versioning 2.0.0.

Version format:

```text
MAJOR.MINOR.PATCH
```

Examples:

```text
0.1.0
0.1.1
0.2.0
1.0.0
```

## PATCH

Use for compatible bug fixes.

Example:

```text
0.1.0 → 0.1.1
```

Examples:

- fix Windows keyboard navigation;
- fix story rendering;
- fix corrupted review count;
- fix NIM retry behavior.

## MINOR

Use for backwards-compatible functionality.

Example:

```text
0.1.1 → 0.2.0
```

Examples:

- add Speak Mode;
- add Learn From Anything;
- add a new learning world;
- add microphone support.

## MAJOR

After the public product contract stabilizes, use for incompatible changes.

Example:

```text
1.4.2 → 2.0.0
```

During early `0.x`, breaking changes are possible, but they MUST still be documented.

---

# 53. Pre-1.0 Version Policy

`0.x` represents active product discovery.

Suggested roadmap:

```text
0.1.0 — Core learning loop
0.2.0 — Speech and stronger review
0.3.0 — Learn From Anything
0.4.0 — Worlds and Boss Challenges
0.5.0 — Immersion / real-content preparation
0.6.0 — Cloud-ready architecture
...
1.0.0 — Stable GoFluent learning platform contract
```

This sequence is directional, not binding.

Each milestone must still obey `RESEARCH.md`.

---

# 54. Changelog

Every release MUST update:

```text
CHANGELOG.md
```

Recommended style:

```text
## [0.2.0]

### Added
- Speak Mode
- microphone transcription

### Changed
- improved contextual review scheduling

### Fixed
- Windows terminal resize issue
```

---

# 55. Release Definition

A release is eligible when:

```text
tests pass
Linux CI passes
Windows CI passes
database migrations pass
version updated
CHANGELOG updated
no critical regression
core learning flow manually tested
```

---

# 56. Data Migrations

Local user progress is valuable.

Database schema changes MUST use migrations.

A new application version SHOULD NOT destroy learner progress.

Before `1.0.0`, migrations can evolve quickly, but they must remain deliberate.

---

# 57. Privacy

The product should minimize data collection.

The local-first MVP SHOULD store learner history locally.

When text, speech, or conversation is sent to an external AI provider, the product SHOULD make this clear in documentation.

Future cloud versions will require a more complete privacy model.

---

# 58. Performance Targets

TUI:

```text
startup: fast enough to feel immediate
navigation: no visible blocking
keystroke handling: immediate
```

AI operations SHOULD use loading states and streaming where useful.

Example:

```text
Generating today's story...
```

The entire UI MUST NOT freeze while awaiting network calls.

---

# 59. Accessibility

The TUI MUST:

- be keyboard-first;
- avoid color-only meaning;
- provide readable textual states;
- work without emoji where terminal support is poor;
- provide ASCII fallbacks for progress indicators where practical.

---

# 60. Analytics for the MVP

Local product metrics SHOULD be available for development.

Examples:

```text
sessions completed
session duration
stories completed
review success
new items encountered
items reaching usable state
listening minutes
reading words
speaking minutes
```

Remote telemetry SHOULD be opt-in unless future product policy states otherwise.

---

# 61. Success Metrics

The MVP should measure product learning signals rather than vanity engagement.

Primary:

```text
weekly meaningful learning sessions
review recall improvement
growth of receptive repertoire
growth of productive repertoire
increase in content lexical coverage
listening comprehension improvement
```

Secondary:

```text
daily journey completion
return rate
story completion
conversation completion
```

---

# 62. MVP Feature Priority

## P0 — Required for `0.1.0`

```text
TUI
onboarding
local profile
SQLite persistence
NVIDIA NIM LLM provider
lexical state model
Daily Journey
adaptive story
contextual vocabulary
review scheduler
typed answers
progress screen
Linux support
Windows support
SemVer
tests
```

## P1 — Strongly Desired

```text
TTS
listening mode
typed Speak Mode
error memory
interests
basic gamification
```

## P2 — Can Move to `0.2.x+`

```text
microphone ASR
shadowing
Boss Challenges
multiple Worlds
Learn From Anything
advanced media preparation
```

---

# 63. `0.1.0` User Story

A new user should be able to:

```text
install GoFluent
        ↓
run `gofluent`
        ↓
complete onboarding
        ↓
complete a lightweight placement test
        ↓
receive a learner profile
        ↓
start Daily Journey
        ↓
review known/weak vocabulary
        ↓
read an adaptive story
        ↓
learn 3–5 useful new items
        ↓
answer comprehension questions
        ↓
practice active recall
        ↓
complete session
        ↓
see updated progress
        ↓
close application
        ↓
reopen later with state preserved
```

If this works well, `0.1.0` is successful.

---

# 64. Proposed `0.1.0` Screens

Required:

```text
Splash
Onboarding
Placement
Home
Daily Journey
Story
Review
Vocabulary Detail
Progress
Settings
Error
```

Optional:

```text
Speak
World
```

---

# 65. Keyboard Model

Global keys:

```text
?       Help
Esc     Back
Ctrl+C  Quit / safe exit
```

Screen-specific shortcuts SHOULD be visible in the footer.

Example:

```text
[Enter] Continue  [R] Replay  [H] Hint  [Esc] Back
```

Avoid relying on complex chord combinations.

---

# 66. Design Language

GoFluent should feel:

```text
calm
focused
smart
progressive
technical but friendly
```

Avoid turning the terminal into visual noise.

Primary principles:

- information hierarchy;
- generous spacing;
- clear progress;
- one main action per screen;
- concise tutor responses.

---

# 67. AI Tutor Personality

The tutor SHOULD be:

- supportive;
- concise;
- patient;
- clear;
- adaptive.

The tutor SHOULD NOT:

- overpraise every answer;
- lecture unnecessarily;
- correct every small mistake;
- use vocabulary far above the learner without purpose.

For beginners, responses should be particularly short.

---

# 68. Content Safety and Quality

Generated learning content SHOULD remain broadly safe and appropriate.

The MVP SHOULD prevent generated content from becoming unnecessarily:

- violent;
- sexual;
- hateful;
- discriminatory;
- disturbing.

Learning examples should prefer everyday neutral scenarios.

---

# 69. Architecture Principle: Deterministic Core, Generative Edge

Central architectural rule:

> **Use deterministic software for state and decisions that need consistency; use the LLM for language generation and interpretation.**

Deterministic:

```text
memory
scheduling
scores
database
versioning
coverage
progress
validation
```

Generative:

```text
stories
explanations
conversation
examples
feedback wording
content adaptation
```

This separation is fundamental to product reliability.

---

# 70. Architecture Principle: Provider Independence

NVIDIA NIM is the MVP provider, not the permanent architecture boundary.

Use interfaces for:

```text
LLM
ASR
TTS
Embeddings
```

This allows:

- hosted NIM;
- self-hosted NIM;
- alternative providers;
- future local inference.

---

# 71. Architecture Principle: Research Before Feature

Every major learning feature proposal SHOULD answer:

```text
1. Which learner problem does this solve?
2. Which principle in RESEARCH.md supports it?
3. What learner behavior should improve?
4. How will we measure that?
5. Could the same result be achieved more simply?
```

This prevents feature creep.

---

# 72. Decision Record Policy

Significant technical or pedagogical choices SHOULD be captured as ADRs.

Example:

```text
docs/adr/
├── 0001-use-ink-for-tui.md
├── 0002-use-sqlite-local-first.md
├── 0003-nim-provider-abstraction.md
└── 0004-contextual-srs.md
```

---

# 73. Definition of Done for Learning Features

A learning feature is not complete merely because the UI works.

Definition of Done:

```text
UI works
domain logic tested
learner state updates correctly
RESEARCH.md principle identified
LLM output validated
failure states handled
Linux verified
Windows verified
metrics emitted
documentation updated
```

---

# 74. Development Phases

## Phase 1 — Foundation

Build:

```text
monorepo
TypeScript configuration
Ink shell
navigation
SQLite
configuration
NIM client
testing
CI
```

## Phase 2 — Learner Model

Build:

```text
profile
lexeme state
chunks
encounters
review scheduling
progress calculations
```

## Phase 3 — Learning Loop

Build:

```text
Daily Journey
adaptive story
vocabulary introduction
comprehension
recall
session state
```

## Phase 4 — Audio

Build:

```text
TTS
audio playback
listening-first flow
audio cache
```

## Phase 5 — Polish

Build:

```text
Windows fixes
Linux fixes
loading/error states
onboarding polish
progress screen
packaging
```

Release:

```text
0.1.0
```

---

# 75. Post-MVP Direction

## `0.2.x`

Focus:

```text
Speak Mode
ASR
error memory
better contextual SRS
```

## `0.3.x`

Focus:

```text
Learn From Anything
content ingestion
difficulty analysis
vocabulary mining
```

## `0.4.x`

Focus:

```text
Learning Worlds
Boss Challenges
stronger gamification
```

## `0.5.x`

Focus:

```text
media preparation
immersion engine
content recommendations
```

## `0.6.x+`

Focus:

```text
cloud synchronization
multi-device support
possible web client
advanced learner modeling
```

---

# 76. Open Product Questions

These should be answered through MVP testing rather than speculation:

1. What known-vocabulary coverage produces the best engagement for each learner level?
2. How many new lexical items per session is sustainable?
3. How often should the system explicitly show translations?
4. How much grammar explanation do beginners request?
5. How should chunks and individual lexemes compete for review priority?
6. How reliable is automatic productive-vocabulary scoring?
7. How useful is a single estimated "English comprehension %" metric?
8. Do learners prefer generated stories or curated content?
9. How much audio should occur before text is revealed?
10. How frequently should speaking corrections appear?
11. Should streaks exist, and if so, how can they avoid becoming the primary motivation?
12. How much personalization is useful before it becomes repetitive?

---

# 77. Research Backlog

Future research areas:

```text
FSRS and modern memory scheduling
lexical frequency datasets
CEFR lexical mapping
chunk frequency datasets
automatic lexical coverage
speech intelligibility scoring
pronunciation feedback
second-language listening difficulty
graded reader generation validation
automatic content difficulty estimation
learner-model calibration
```

Any substantial changes resulting from new research SHOULD update:

```text
RESEARCH.md
```

before or alongside implementation changes.

---

# 78. Documentation Hierarchy

The project documentation hierarchy SHOULD be:

```text
RESEARCH.md
    ↓
pedagogical truth

PRD.md
    ↓
product requirements

ADRs
    ↓
technical/product decisions

issues / milestones
    ↓
implementation work

code
```

If implementation conflicts with `PRD.md`, the discrepancy should be intentional and documented.

If `PRD.md` conflicts with `RESEARCH.md` on pedagogy, the discrepancy should be reviewed.

---

# 79. Source Control Policy

Recommended branch strategy for MVP:

```text
main
feature/*
fix/*
```

Every release SHOULD create a Git tag:

```text
v0.1.0
v0.1.1
v0.2.0
```

Release tags MUST correspond to the version in the package metadata.

---

# 80. Initial Technical Decisions

For the first implementation, this PRD recommends:

```text
Runtime           Node.js 24 LTS
Language          TypeScript
TUI               React + Ink
Persistence       SQLite
Package manager   pnpm
Validation        Zod
AI                NVIDIA NIM
LLM access        provider abstraction
Speech            NVIDIA ASR and local Kokoro TTS adapters
Tests             Vitest
Versioning        SemVer 2.0.0
CI                Linux + Windows
```

Individual dependencies may change if implementation research identifies a stronger option.

The architectural contracts are more important than individual libraries.

---

# 81. MVP Acceptance Criteria

`v0.1.0` is accepted when all of the following are true:

- [ ] GoFluent launches from a terminal.
- [ ] The TUI works on Linux.
- [ ] The TUI works on Windows.
- [ ] New users can complete onboarding.
- [ ] Placement initializes a learner profile.
- [ ] Learner progress persists across restarts.
- [ ] NIM configuration works without hardcoded secrets.
- [ ] The system can generate an adaptive story.
- [ ] Story generation uses learner vocabulary state.
- [ ] Generated stories are validated before display.
- [ ] New vocabulary is limited and contextual.
- [ ] Vocabulary encounters are persisted.
- [ ] Reviews are scheduled deterministically.
- [ ] Review success updates learner state.
- [ ] Receptive and productive vocabulary are tracked separately.
- [ ] A Daily Journey can be completed end-to-end.
- [ ] Progress updates after the session.
- [ ] Network failures do not crash the application.
- [ ] Critical learning logic has automated tests.
- [ ] CI passes on Linux and Windows.
- [ ] Version is `0.1.0`.
- [ ] `CHANGELOG.md` exists.
- [ ] `RESEARCH.md` is present in the repository.
- [ ] Product behavior does not contradict the core principles in `RESEARCH.md`.

---

# 82. Final Product Principle

GoFluent should not optimize for completing lessons.

It should optimize for increasing the amount of English the learner can genuinely understand and use.

The product loop is:

```text
Understand more
      ↓
Notice useful language
      ↓
Remember it
      ↓
Meet it again
      ↓
Use it
      ↓
Become faster
      ↓
Understand even more
```

Every meaningful feature should strengthen this loop.

---

# 83. References for Technical Decisions

Current technical decisions should be periodically revalidated because software ecosystems change.

At the time this PRD was created:

- Node.js 24 is an LTS release line.
- Ink provides a React-based component model for interactive command-line applications.
- Semantic Versioning 2.0.0 defines the `MAJOR.MINOR.PATCH` release model used by GoFluent.

Primary references:

- Node.js release schedule and release documentation
- Ink project documentation
- Semantic Versioning 2.0.0 specification
- NVIDIA NIM official documentation
- `RESEARCH.md` for GoFluent pedagogical research

---

# 84. Document Version

```text
PRD Version: 0.1.0
Product Target: GoFluent 0.1.0
```

Changes to this PRD SHOULD be versioned in source control.

The product implementation should always treat the latest accepted `RESEARCH.md` and `PRD.md` as its primary product-development context.
