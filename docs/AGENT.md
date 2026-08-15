# AGENT.md — GoFluent Engineering Agent Guide

> **Project:** GoFluent  
> **Purpose:** Operational instructions for AI coding agents and contributors  
> **Primary Product Docs:** `RESEARCH.md` and `PRD.md`  
> **Initial Product Version:** `0.1.0`

---

# 1. Mission

You are working on **GoFluent**, an AI-powered English acquisition system.

GoFluent is not a traditional grammar course and must not become a generic chatbot wrapper.

The product exists to help learners progressively understand and use real English through:

- comprehensible input;
- vocabulary and lexical chunks;
- contextual repetition;
- retrieval practice;
- spaced repetition;
- listening;
- reading;
- speaking;
- writing;
- personalized learner modeling;
- adaptive content.

The product thesis is:

> **Everything the learner consumes should adapt to what they already know, and important vocabulary should keep reappearing until it becomes usable English.**

---

# 2. Source of Truth

Before implementing a meaningful feature, read:

```text
RESEARCH.md
PRD.md
```

Priority order:

```text
1. RESEARCH.md
2. PRD.md
3. ADRs
4. Issues / task description
5. Existing implementation
```

If implementation behavior conflicts with `RESEARCH.md` on pedagogy, do not silently preserve the conflict.

If `PRD.md` conflicts with `RESEARCH.md`, treat the conflict as something that must be reviewed.

Do not invent product behavior that contradicts these documents.

---

# 3. Core Product Rules

The following principles are non-negotiable unless explicitly changed in project documentation.

1. Vocabulary and lexical chunks are primary learning units.
2. Grammar is a support system, not the primary curriculum.
3. Important vocabulary must be encountered multiple times.
4. Learning should combine input, recall, output, and re-exposure.
5. Audio is a first-class learning modality.
6. Content difficulty should adapt to the learner.
7. Prefer contextual vocabulary over isolated translation.
8. Track receptive and productive knowledge separately.
9. Use spaced review, preferably contextual.
10. Gamification must represent meaningful competence.
11. The LLM is not the source of truth for learner state.
12. Persistent structured state controls progression.
13. The product should gradually move the learner toward independent immersion.
14. Unknown-language density must remain controlled.
15. Prefer high-value vocabulary over rare, low-impact vocabulary.

---

# 4. Engineering Philosophy

Use:

> **Deterministic core, generative edge.**

Deterministic software owns:

```text
learner state
memory
review scheduling
scores
database state
progress
lexical coverage
validation
versioning
migrations
business rules
```

LLMs own:

```text
story generation
examples
explanations
conversation
feedback wording
content adaptation
open-ended interpretation
```

Never move deterministic responsibilities into prompts merely because it is easier.

---

# 5. Technology Stack

Primary stack:

```text
Runtime           Node.js 24 LTS
Language          TypeScript
TUI               React + Ink
Persistence       SQLite
Validation        Zod
AI                NVIDIA NIM
Testing           Vitest
Package manager   pnpm
Versioning        SemVer 2.0.0
```

Required runtime platforms:

```text
Linux x64
Windows x64
```

Do not introduce dependencies that unnecessarily make either required platform difficult to support.

---

# 6. TypeScript Rules

TypeScript must remain strict.

Expected compiler posture:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Avoid:

```ts
any
```

Prefer:

```ts
unknown
```

at trust boundaries, then validate and narrow.

External data must be validated.

Examples:

- LLM output;
- environment variables;
- configuration;
- persisted JSON;
- external API responses.

---

# 7. Repository Architecture

Preferred structure:

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
├── docs/
│   └── adr/
│
├── RESEARCH.md
├── PRD.md
├── AGENT.md
├── CHANGELOG.md
├── package.json
└── README.md
```

Do not place domain logic inside TUI components.

---

# 8. Module Boundaries

## `apps/tui`

Responsible for:

- rendering;
- screens;
- terminal input;
- navigation;
- user interaction;
- loading/error presentation.

Must not own:

- review algorithms;
- lexical scoring;
- session planning;
- persistence rules.

---

## `packages/core`

Responsible for:

- domain types;
- core interfaces;
- shared rules;
- domain constants.

---

## `packages/learning-engine`

Responsible for:

- Daily Journey planning;
- learner state transitions;
- mastery updates;
- learning session orchestration.

---

## `packages/lexical-engine`

Responsible for:

- lexeme/chunk models;
- frequency;
- coverage;
- learning value;
- vocabulary selection;
- lexical analysis.

---

## `packages/content-engine`

Responsible for:

- story analysis;
- generated-content validation;
- difficulty estimation;
- lexical coverage;
- target-item verification.

---

## `packages/ai`

Responsible for:

- NVIDIA NIM LLM adapter;
- provider interfaces;
- structured generation;
- prompts;
- retries;
- response validation.

---

## `packages/speech`

Responsible for:

- ASR abstraction;
- TTS abstraction;
- NVIDIA Speech NIM adapters;
- audio-related integration.

---

## `packages/db`

Responsible for:

- SQLite;
- migrations;
- repositories;
- transaction boundaries;
- persistence implementation.

---

## `packages/config`

Responsible for:

- environment variables;
- runtime configuration;
- validation;
- defaults.

---

# 9. Domain Model

Important entities include:

```text
User
LearnerProfile
Lexeme
Chunk
LearnerLexemeState
LearnerChunkState
Encounter
ReviewItem
Content
LearningSession
LearnerError
```

Avoid reducing lexical knowledge to:

```text
known: boolean
```

Prefer continuous evidence-based state.

Example:

```ts
interface LearnerLexemeState {
  lexemeId: string;
  encounters: number;
  heardCount: number;
  readingRecognition: number;
  listeningRecognition: number;
  recallScore: number;
  productiveScore: number;
  pronunciationScore?: number;
  lastSeenAt?: Date;
  nextReviewAt?: Date;
}
```

---

# 10. Receptive vs Productive Vocabulary

These are distinct.

Receptive evidence:

```text
recognizes meaning
understands in reading
understands in listening
```

Productive evidence:

```text
free recall
correct written use
correct spoken use
spontaneous conversational use
```

Do not update productive mastery based only on recognition.

---

# 11. Encounter-Driven Learning State

Every meaningful learner interaction with a lexical item should produce an encounter event.

Example:

```ts
type EncounterModality =
  | 'READING'
  | 'LISTENING'
  | 'RECALL'
  | 'WRITING'
  | 'SPEAKING';

type EncounterResult =
  | 'SUCCESS'
  | 'PARTIAL'
  | 'FAIL'
  | 'SKIPPED';
```

The learner model should evolve from evidence, not arbitrary LLM judgments.

---

# 12. Review Scheduling

The review scheduler must be deterministic.

Do not ask the LLM:

> When should this word be reviewed again?

The scheduler may use:

```text
time since last encounter
recall success
encounter count
item difficulty
learning value
receptive state
productive state
```

A future FSRS-inspired algorithm is acceptable.

For MVP, prefer a simple algorithm that is understandable, testable, and replaceable.

---

# 13. Vocabulary Selection

Do not choose new vocabulary randomly.

A useful conceptual score is:

```text
Learning Value =
frequency
× contextual usefulness
× learner interest
× upcoming content relevance
× memory need
```

Exact weights are implementation details.

Prioritize:

- high-frequency language;
- common chunks;
- common connectors;
- useful phrasal verbs;
- vocabulary relevant to goals;
- vocabulary relevant to upcoming content.

---

# 14. Adaptive Content Rules

Generated stories should approximately target:

```text
90–95% known language
3–8% review language
2–5% new language
```

These values are defaults and may vary by learner stage.

The backend must validate generated content.

Never trust the LLM's claim that it satisfied lexical constraints.

Validation should include:

```text
length
target-item presence
unknown-language ratio
known-language coverage
duplicate/repetition issues
schema compliance
```

If invalid:

```text
repair
or
regenerate
```

---

# 15. LLM Output Is Untrusted Input

Always assume model output may be:

- malformed;
- incomplete;
- semantically wrong;
- outside requested schema;
- inconsistent with learner state.

Required pattern:

```text
NIM response
    ↓
parse
    ↓
Zod validation
    ↓
domain validation
    ↓
accept or retry
```

Never persist unvalidated AI-generated learner state.

---

# 16. AI Provider Independence

Use an abstraction.

Example:

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

Do not leak NVIDIA-specific response objects into the product domain.

The same rule applies to:

```text
ASR
TTS
Embeddings
```

---

# 17. NVIDIA NIM Configuration

Expected configuration may include:

```text
NVIDIA_NIM_BASE_URL
NVIDIA_NIM_API_KEY
NVIDIA_NIM_MODEL
```

Never:

- hardcode API keys;
- commit secrets;
- print secrets in logs;
- include credentials in snapshots.

---

# 18. Prompts

Prompts are code assets.

They should be:

```text
versioned
tested
structured
minimal
explicit
```

Suggested organization:

```text
packages/ai/src/prompts/
├── story/
│   └── v1.ts
├── tutor/
│   └── v1.ts
├── placement/
│   └── v1.ts
└── vocabulary/
    └── v1.ts
```

Prefer structured output over freeform parsing.

---

# 19. Prompt Design Rules

Prompts should provide only the learner context needed for the task.

Do not dump the entire database into a prompt.

Prefer:

```text
target items
recent relevant errors
summary of lexical state
learner level
learner interests
content constraints
```

Protect context windows and latency.

---

# 20. TUI Rules

The application must work with keyboard-only navigation.

Global expectations:

```text
Esc     Back
?       Help
Ctrl+C  Safe exit
```

Critical information must not depend only on color.

TUI should support:

```text
80 × 24
```

as a reasonable minimum terminal target.

The interface should gracefully degrade in terminals with limited:

- Unicode;
- color;
- dimensions.

---

# 21. TUI Design Principles

The UI should feel:

```text
calm
focused
smart
progressive
clear
```

Avoid:

- excessive borders;
- animation for its own sake;
- noisy dashboards;
- too many simultaneous actions;
- huge AI messages.

For beginner learning interactions, keep tutor output concise.

---

# 22. Cross-Platform Rules

Every change that affects:

```text
paths
shell commands
terminal input
audio
process spawning
file storage
ANSI rendering
```

must be considered for both Linux and Windows.

Avoid assumptions such as:

```text
/tmp
/bin/bash
forward-slash-only paths
POSIX-only signals
Linux-only audio tools
```

Prefer Node cross-platform APIs.

Use `path.join`, application-data resolution, and platform-aware adapters.

---

# 23. Persistence

MVP is local-first.

Preferred database:

```text
SQLite
```

Schema changes must use migrations.

Never delete learner progress as a shortcut for handling schema evolution.

Destructive migration behavior must be explicitly documented.

---

# 24. Database Rules

Repositories should hide raw database mechanics from domain logic.

Prefer:

```text
domain
  ↓
repository interface
  ↓
SQLite implementation
```

Use transactions when multiple writes represent one domain operation.

Example:

Completing a recall may need to atomically update:

```text
encounter
learner lexical state
review schedule
session metrics
```

---

# 25. Daily Journey

Daily Journey is the primary MVP experience.

Expected sequence:

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

Do not expand the MVP with unrelated features before this loop works end-to-end.

---

# 26. Feature Priority

## P0

Must work first:

```text
TUI shell
onboarding
local profile
SQLite
NVIDIA NIM
lexical state
Daily Journey
adaptive story
review scheduler
typed interaction
progress
Linux
Windows
tests
```

## P1

After P0:

```text
TTS
listening
typed Speak Mode
error memory
interests
basic gamification
```

## P2

Later:

```text
ASR
shadowing
Boss Challenges
Learn From Anything
media preparation
advanced immersion
```

Do not implement P2 while core P0 behavior is unstable unless explicitly requested.

---

# 27. MVP Restraint

When choosing between:

```text
a smaller reliable feature
```

and:

```text
a broader AI-heavy feature with weak state/validation
```

choose the smaller reliable feature.

The MVP exists to validate the learning loop.

It does not need to prove every future GoFluent idea.

---

# 28. Grammar Rules

Do not build the main navigation around grammar chapters.

Good:

```text
Pattern noticed:
You've seen "I've already..." several times.
Want a short explanation?
```

Bad:

```text
Unit 1 — Verb To Be
Unit 2 — Present Simple
Unit 3 — Present Perfect
```

Grammar is allowed for:

- correction;
- explanation;
- learner questions;
- pattern discovery.

---

# 29. Correction Rules

Do not correct every mistake.

Prioritize:

- communication-blocking errors;
- recurring errors;
- target-language errors;
- highly reusable corrections.

Prefer a few corrections after conversational flow.

Example:

```text
You said:
"I did a mistake."

More natural:
"I made a mistake."
```

Avoid overwhelming the learner.

---

# 30. Audio Rules

Audio is a first-class capability.

Where practical, reading content should be compatible with:

```text
normal playback
slow playback
sentence playback
with transcript
without transcript
```

Speech integration must remain behind adapters.

Do not tightly couple the domain layer to one playback library or platform-specific binary.

---

# 31. Testing Requirements

Critical learning logic requires tests.

Mandatory unit-test targets:

```text
mastery updates
review scheduling
lexical coverage
learning-value scoring
content validation
session state transitions
```

Integration tests should cover:

```text
SQLite repositories
NIM adapter
structured AI validation
Daily Journey planner
```

TUI tests should cover:

```text
navigation
onboarding
Daily Journey
error states
keyboard behavior
```

---

# 32. AI Evaluation

Do not rely only on standard unit tests for prompts.

Maintain eval fixtures.

Suggested structure:

```text
evals/
├── beginner-story.json
├── vocabulary-explanation.json
├── tutor-correction.json
└── placement.json
```

Useful checks:

```text
valid schema
required vocabulary present
difficulty constraints respected
no excessive unknown vocabulary
no excessive corrections
appropriate response length
```

---

# 33. CI

Required CI environments:

```text
Ubuntu
Windows
```

Required baseline:

```text
Node.js 24
```

A release must not ship if required platform CI is failing.

---

# 34. SemVer

Use Semantic Versioning.

Format:

```text
MAJOR.MINOR.PATCH
```

During pre-1.0:

```text
0.1.0
0.1.1
0.2.0
```

Use PATCH for compatible fixes.

Use MINOR for compatible functionality.

Breaking changes during `0.x` are allowed but must be documented.

Do not silently change persisted data formats or CLI contracts.

---

# 35. Changelog

Every release updates:

```text
CHANGELOG.md
```

Use sections such as:

```text
Added
Changed
Fixed
Removed
Security
```

---

# 36. Git Tags

Release tags:

```text
v0.1.0
v0.1.1
v0.2.0
```

Tag version must match package version.

---

# 37. ADRs

Create an ADR for significant decisions.

Examples:

```text
docs/adr/0001-use-ink.md
docs/adr/0002-sqlite-local-first.md
docs/adr/0003-nim-provider-interface.md
docs/adr/0004-contextual-review.md
```

An ADR should capture:

```text
context
decision
alternatives
consequences
```

Do not create ADRs for trivial implementation details.

---

# 38. Documentation Updates

Update documentation when behavior changes.

Potential files:

```text
README.md
PRD.md
RESEARCH.md
CHANGELOG.md
ADRs
```

Do not rewrite `RESEARCH.md` casually.

Changes to pedagogical foundations should be deliberate and evidence-driven.

---

# 39. Research Compliance

Before introducing a learning feature, answer:

```text
1. What learner problem does it solve?
2. Which RESEARCH.md principle supports it?
3. Which observable behavior should improve?
4. How will we measure that?
5. Is there a simpler implementation?
```

If these cannot be answered, reconsider the feature.

---

# 40. Error Handling

Never dump raw technical errors as the primary user experience.

Bad:

```text
ECONNRESET
```

Better:

```text
GoFluent could not reach the AI service.

[R] Retry
[H] Home
[D] Technical details
```

Developer detail should remain accessible.

---

# 41. Logging

Never log:

```text
API keys
secrets
credentials
```

Avoid logging full learner conversations by default.

Use structured logs where possible.

Development logging can be verbose.

Production/user logging should be minimal.

---

# 42. Performance

Do not block the TUI event loop during:

- network calls;
- database-heavy work;
- AI generation;
- audio operations.

The interface should remain responsive.

Use loading states.

Streaming may be used when it improves experience.

---

# 43. Security

Treat all external input as untrusted.

Validate:

```text
LLM output
user-provided paths
configuration
environment variables
database input
future imported content
```

Do not use unsafe shell interpolation.

Avoid executing generated model content as code.

---

# 44. Privacy

Local-first behavior is preferred for the MVP.

Be careful with:

```text
learner conversations
speech recordings
personal interests
assessment history
```

Do not add remote telemetry without explicit product intent.

---

# 45. Do Not Overengineer

Avoid introducing:

- microservices;
- Kubernetes;
- message brokers;
- complex event infrastructure;
- custom distributed systems;
- unnecessary cloud dependencies.

The initial architecture should be modular but local and understandable.

Prefer a monorepo with clean package boundaries.

---

# 46. Do Not Fine-Tune Yet

Do not introduce model fine-tuning into the MVP unless explicitly requested.

Use:

```text
prompting
structured output
validation
state
retrieval
```

first.

Fine-tuning becomes useful only after GoFluent has sufficient real learner data and a clear evaluation target.

---

# 47. Implementation Workflow

For every substantial task:

## Step 1

Read relevant sections of:

```text
RESEARCH.md
PRD.md
AGENT.md
```

## Step 2

Inspect existing implementation before editing.

## Step 3

Identify affected package boundaries.

## Step 4

Write or update tests.

## Step 5

Implement the smallest correct change.

## Step 6

Run:

```text
typecheck
lint
unit tests
integration tests
```

## Step 7

Run relevant cross-platform-sensitive tests.

## Step 8

Update docs/changelog if behavior changed.

---

# 48. Definition of Done

A feature is complete when:

```text
implementation works
tests exist
typecheck passes
lint passes
AI output is validated
failure states are handled
learner state updates correctly
Linux behavior is considered
Windows behavior is considered
research principle is respected
documentation is updated where required
```

For a learning feature, a working UI alone is never sufficient.

---

# 49. Code Quality

Prefer:

```text
small functions
explicit types
pure domain functions
clear interfaces
dependency injection at provider boundaries
testable deterministic logic
```

Avoid:

```text
god classes
giant React components
hidden global state
business logic inside rendering
prompt strings scattered across UI code
direct database calls from screens
```

---

# 50. Comments

Use comments to explain:

```text
why
constraints
non-obvious trade-offs
research-derived behavior
```

Do not comment obvious syntax.

Bad:

```ts
// Increment count
count++;
```

Good:

```ts
// Recognition alone must not increase productive mastery.
// See RESEARCH.md: receptive vs productive vocabulary.
```

---

# 51. Naming

Use domain terminology consistently.

Prefer:

```text
lexeme
chunk
encounter
receptive
productive
review
learner
journey
```

Avoid multiple competing terms for the same concept.

---

# 52. Feature Flags

During `0.x`, feature flags may be useful for incomplete features.

Examples:

```text
speech
bossChallenges
learnFromAnything
```

Do not expose unstable features by default without product intent.

---

# 53. Data Integrity

Learner progress is valuable.

Do not:

- reset progress to fix bugs;
- overwrite state from AI responses;
- perform destructive migrations without safeguards;
- conflate estimated scores with observed evidence.

---

# 54. Estimates Must Be Labeled

Values such as:

```text
Estimated everyday comprehension: 42%
Estimated vocabulary size: 812
Estimated CEFR level: A1
```

are estimates.

Do not present probabilistic model outputs as objective measurements.

---

# 55. Gamification Constraint

Do not optimize the system around XP.

Preferred metrics:

```text
receptive repertoire growth
productive repertoire growth
meaningful listening time
words read
successful recalls
content comprehension
domain mastery
```

Gamification should make progress visible, not manipulate behavior.

---

# 56. Product Tone

GoFluent should be:

```text
supportive
clear
concise
non-judgmental
```

Avoid:

- excessive praise;
- childish messaging for adult learners;
- shame-based streak mechanics;
- inflated claims about fluency.

---

# 57. Future Compatibility

Architecture should leave room for:

```text
web client
mobile client
cloud sync
multiple AI providers
self-hosted NIM
embeddings
content ingestion
additional target languages
```

Do not implement these prematurely.

Design interfaces so they are possible later.

---

# 58. When Requirements Are Ambiguous

Use this priority:

```text
preserve learner progress
preserve research principles
preserve cross-platform behavior
prefer simpler implementation
prefer deterministic behavior
avoid expanding MVP scope
```

Document significant interpretation in an ADR or issue.

---

# 59. Prohibited Shortcuts

Do not:

- hardcode fake learner mastery to make UI work;
- let the LLM decide database state directly;
- skip runtime validation for AI output;
- add grammar-first navigation;
- use isolated flashcards as the entire review system;
- couple business logic to Ink;
- couple domain logic directly to NVIDIA response types;
- use Linux-only assumptions;
- silently break Windows;
- expose secrets;
- destroy user progress during migrations;
- create giant prompts instead of proper state models.

---

# 60. Recommended First Milestone

For `0.1.0`, optimize for this exact user story:

```text
install GoFluent
        ↓
run `gofluent`
        ↓
complete onboarding
        ↓
complete lightweight placement
        ↓
create learner profile
        ↓
start Daily Journey
        ↓
review weak vocabulary
        ↓
consume adaptive story
        ↓
learn 3–5 useful items
        ↓
answer comprehension questions
        ↓
perform recall
        ↓
complete session
        ↓
see updated progress
        ↓
quit
        ↓
reopen with state preserved
```

Do not allow side features to jeopardize this path.

---

# 61. Final Rule

Before committing a substantial implementation decision, ask:

> **Does this help GoFluent understand the learner better, give them better English input, help useful language stay in memory, or help them use English more naturally?**

If not, it may not belong in the MVP.

GoFluent is not measured by how many AI features it has.

It is measured by how much more English the learner can genuinely understand and use.
