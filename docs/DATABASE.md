# DATABASE.md — GoFluent Database Design

> **Project:** GoFluent  
> **Initial Product Version:** `0.1.0`  
> **Database:** SQLite  
> **Persistence Strategy:** Local-first  
> **Primary Runtime:** Node.js + TypeScript  
> **Pedagogical Source of Truth:** `RESEARCH.md`  
> **Product Source of Truth:** `PRD.md`  
> **Architecture Source of Truth:** `ARCHITECTURE.md`

---

# 1. Purpose

This document defines the database architecture for GoFluent.

The database exists to preserve the learner model.

It is not merely application storage.

The most important product asset is the structured evidence of:

```text
what the learner has seen
what they understand
what they can recall
what they can actively use
what they are forgetting
what they repeatedly get wrong
what content they have consumed
```

The database must therefore optimize for:

- learner-state correctness;
- historical evidence;
- safe schema evolution;
- deterministic review scheduling;
- lexical analysis;
- local-first reliability;
- cross-platform compatibility;
- simple migrations;
- future cloud synchronization.

---

# 2. Database Principles

GoFluent database design follows these principles:

1. Learner progress must survive application upgrades.
2. LLM output must never directly overwrite canonical learner state.
3. Historical encounters should be append-oriented.
4. Derived state may be recalculated where practical.
5. Receptive and productive knowledge must be distinct.
6. Review scheduling must be explicit and deterministic.
7. Content generation metadata should be auditable.
8. Schema changes require migrations.
9. Data should remain understandable and inspectable.
10. The MVP should avoid unnecessary database complexity.

---

# 3. Database Choice

MVP database:

```text
SQLite
```

Reasons:

- local-first;
- single-file persistence;
- transactional;
- mature;
- reliable;
- cross-platform;
- zero external service requirement;
- easy backup;
- easy migration;
- suitable for one-user local application.

SQLite is sufficient for the entire MVP and likely several subsequent `0.x` releases.

---

# 4. Database Location

Use platform-specific application data directories.

Conceptual locations:

Linux:

```text
~/.local/share/gofluent/gofluent.db
```

Windows:

```text
%APPDATA%\GoFluent\gofluent.db
```

The exact path should be resolved using a cross-platform application-data utility.

Never hardcode a POSIX-only path.

---

# 5. Database File Layout

Possible application data directory:

```text
gofluent/
├── gofluent.db
├── cache/
├── audio/
├── logs/
└── config/
```

Only persistent structured state belongs in SQLite.

Large audio files should remain on disk and be referenced from the database.

---

# 6. Database Layering

Recommended direction:

```text
Domain / Application
        ↓
Repository Interfaces
        ↓
SQLite Repository Implementations
        ↓
SQLite
```

TUI components must not run SQL directly.

AI providers must not write directly to the database.

---

# 7. Initial Entity Map

Core entities:

```text
User
LearnerProfile
LearnerInterest
Lexeme
LexemeForm
Chunk
LearnerLexemeState
LearnerChunkState
Encounter
ReviewItem
Content
ContentTargetItem
LearningSession
SessionActivity
LearnerError
Setting
SchemaMigration
```

Possible future entities:

```text
World
WorldProgress
BossChallenge
ImportedContent
MediaPreparation
EmbeddingReference
SyncState
```

---

# 8. Relationship Overview

```text
User
 │
 ├── LearnerProfile
 │
 ├── LearnerInterest
 │
 ├── LearnerLexemeState ── Lexeme
 │
 ├── LearnerChunkState ─── Chunk
 │
 ├── Encounter
 │
 ├── ReviewItem
 │
 ├── LearningSession
 │    └── SessionActivity
 │
 └── LearnerError

Content
 ├── ContentTargetItem
 └── Encounter

Lexeme
 └── LexemeForm
```

---

# 9. IDs

Prefer application-generated string IDs.

Recommended format:

```text
UUID
```

or a sortable alternative such as:

```text
ULID
```

The implementation should choose one and use it consistently.

Advantages over SQLite auto-increment IDs:

- future sync friendliness;
- easier offline creation;
- less collision risk across devices;
- provider-independent references.

---

# 10. Time Storage

Persist timestamps as UTC.

Recommended representation:

```text
ISO 8601 text
```

Example:

```text
2026-08-14T23:53:00.000Z
```

Alternative integer Unix timestamps are acceptable, but consistency is more important.

Do not store local-time-only values for historical events.

---

# 11. Boolean Storage

SQLite has no dedicated Boolean storage class.

Use:

```text
INTEGER
0 = false
1 = true
```

Repository code should expose booleans in TypeScript.

---

# 12. Score Storage

Mastery scores use:

```text
REAL
```

Expected domain range:

```text
0.0 → 1.0
```

Database constraints should enforce valid ranges where practical.

Example:

```sql
CHECK (recall_score >= 0.0 AND recall_score <= 1.0)
```

---

# 13. `users`

MVP is local single-user, but keep a user entity.

Schema:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

This makes future multi-profile or cloud migration easier.

No email/account field is required in the local MVP.

---

# 14. `learner_profiles`

Stores high-level learner configuration and estimates.

```sql
CREATE TABLE learner_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,

  native_language TEXT NOT NULL,
  target_language TEXT NOT NULL,

  estimated_cefr TEXT,
  estimated_receptive_vocabulary INTEGER,
  estimated_productive_vocabulary INTEGER,

  daily_minutes INTEGER NOT NULL DEFAULT 20,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Important:

Estimated values are not canonical mastery facts.

They are summary estimates.

---

# 15. `learner_interests`

Stores user interests used for content personalization.

```sql
CREATE TABLE learner_interests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  interest TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  created_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Unique constraint:

```sql
CREATE UNIQUE INDEX idx_learner_interests_user_interest
ON learner_interests(user_id, interest);
```

---

# 16. `lexemes`

Canonical lexical items.

```sql
CREATE TABLE lexemes (
  id TEXT PRIMARY KEY,

  language TEXT NOT NULL,
  lemma TEXT NOT NULL,
  part_of_speech TEXT,

  frequency_rank INTEGER,
  cefr TEXT,

  metadata_json TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Unique index should consider language and normalized lemma.

Example:

```sql
CREATE UNIQUE INDEX idx_lexemes_language_lemma_pos
ON lexemes(language, lemma, part_of_speech);
```

---

# 17. Lexeme Metadata

Do not create dozens of columns prematurely.

`metadata_json` may temporarily store lower-priority lexical metadata such as:

```text
pronunciation
IPA
source dataset
semantic tags
frequency source
notes
```

Frequently queried properties should become real columns later.

---

# 18. `lexeme_forms`

Stores inflected or surface forms.

Examples:

```text
go
goes
went
gone
going
```

Schema:

```sql
CREATE TABLE lexeme_forms (
  id TEXT PRIMARY KEY,
  lexeme_id TEXT NOT NULL,
  form TEXT NOT NULL,
  normalized_form TEXT NOT NULL,

  FOREIGN KEY (lexeme_id) REFERENCES lexemes(id)
);
```

Indexes:

```sql
CREATE INDEX idx_lexeme_forms_normalized
ON lexeme_forms(normalized_form);

CREATE INDEX idx_lexeme_forms_lexeme
ON lexeme_forms(lexeme_id);
```

---

# 19. `chunks`

Stores multi-word lexical units.

Examples:

```text
look forward to
figure out
by the way
give me a break
```

Schema:

```sql
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,

  language TEXT NOT NULL,
  text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,

  chunk_type TEXT,
  frequency_rank INTEGER,
  cefr TEXT,

  metadata_json TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Unique index:

```sql
CREATE UNIQUE INDEX idx_chunks_language_normalized
ON chunks(language, normalized_text);
```

---

# 20. Chunk Types

Possible values:

```text
COLLOCATION
PHRASAL_VERB
EXPRESSION
IDIOM
FRAME
CONNECTOR
FORMULAIC
```

Store as text to make evolution easier during `0.x`.

TypeScript should use a validated union.

---

# 21. `learner_lexeme_state`

Central learner-state table.

```sql
CREATE TABLE learner_lexeme_state (
  learner_id TEXT NOT NULL,
  lexeme_id TEXT NOT NULL,

  encounters INTEGER NOT NULL DEFAULT 0,
  heard_count INTEGER NOT NULL DEFAULT 0,

  reading_recognition REAL NOT NULL DEFAULT 0.0,
  listening_recognition REAL NOT NULL DEFAULT 0.0,
  recall_score REAL NOT NULL DEFAULT 0.0,
  productive_score REAL NOT NULL DEFAULT 0.0,
  pronunciation_score REAL,

  last_seen_at TEXT,
  last_success_at TEXT,
  next_review_at TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (learner_id, lexeme_id),

  FOREIGN KEY (learner_id) REFERENCES users(id),
  FOREIGN KEY (lexeme_id) REFERENCES lexemes(id),

  CHECK (reading_recognition BETWEEN 0.0 AND 1.0),
  CHECK (listening_recognition BETWEEN 0.0 AND 1.0),
  CHECK (recall_score BETWEEN 0.0 AND 1.0),
  CHECK (productive_score BETWEEN 0.0 AND 1.0),
  CHECK (
    pronunciation_score IS NULL
    OR pronunciation_score BETWEEN 0.0 AND 1.0
  )
);
```

---

# 22. Learner Lexeme State Indexes

Important indexes:

```sql
CREATE INDEX idx_learner_lexeme_next_review
ON learner_lexeme_state(learner_id, next_review_at);

CREATE INDEX idx_learner_lexeme_productive
ON learner_lexeme_state(learner_id, productive_score);

CREATE INDEX idx_learner_lexeme_recall
ON learner_lexeme_state(learner_id, recall_score);
```

---

# 23. `learner_chunk_state`

Equivalent state for chunks.

```sql
CREATE TABLE learner_chunk_state (
  learner_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,

  encounters INTEGER NOT NULL DEFAULT 0,
  heard_count INTEGER NOT NULL DEFAULT 0,

  reading_recognition REAL NOT NULL DEFAULT 0.0,
  listening_recognition REAL NOT NULL DEFAULT 0.0,
  recall_score REAL NOT NULL DEFAULT 0.0,
  productive_score REAL NOT NULL DEFAULT 0.0,

  last_seen_at TEXT,
  last_success_at TEXT,
  next_review_at TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (learner_id, chunk_id),

  FOREIGN KEY (learner_id) REFERENCES users(id),
  FOREIGN KEY (chunk_id) REFERENCES chunks(id)
);
```

Use equivalent score checks.

---

# 24. Why Separate Lexemes and Chunks

Do not store chunks as fake single words.

They behave differently.

Example:

```text
take
```

and:

```text
take care
```

have different:

- meaning;
- frequency;
- production behavior;
- review value;
- context.

Separate entities allow better learning logic.

---

# 25. `encounters`

This is one of the most important tables.

It stores historical evidence.

Schema:

```sql
CREATE TABLE encounters (
  id TEXT PRIMARY KEY,

  learner_id TEXT NOT NULL,

  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,

  modality TEXT NOT NULL,
  activity TEXT NOT NULL,
  result TEXT NOT NULL,

  assistance_used INTEGER NOT NULL DEFAULT 0,

  content_id TEXT,
  session_id TEXT,

  confidence REAL,
  metadata_json TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (learner_id) REFERENCES users(id)
);
```

---

# 26. Encounter Item Type

Values:

```text
LEXEME
CHUNK
```

Future:

```text
GRAMMAR_PATTERN
PRONUNCIATION_PATTERN
```

Do not add polymorphic foreign keys with impossible SQLite constraints unless needed.

Repository/application validation should ensure item references are valid.

---

# 27. Encounter Modalities

Recommended values:

```text
READING
LISTENING
RECALL
WRITING
SPEAKING
```

---

# 28. Encounter Activities

Examples:

```text
PLACEMENT
REVIEW
STORY
LISTENING
CONVERSATION
RECAP
BOSS_CHALLENGE
IMPORTED_CONTENT
```

---

# 29. Encounter Results

Recommended:

```text
SUCCESS
PARTIAL
FAIL
SKIPPED
```

Avoid storing arbitrary numeric grades unless the activity truly supports them.

Optional `confidence` can capture evaluator confidence.

---

# 30. Encounter Indexes

Important indexes:

```sql
CREATE INDEX idx_encounters_learner_created
ON encounters(learner_id, created_at DESC);

CREATE INDEX idx_encounters_item
ON encounters(learner_id, item_type, item_id, created_at DESC);

CREATE INDEX idx_encounters_session
ON encounters(session_id);

CREATE INDEX idx_encounters_content
ON encounters(content_id);
```

---

# 31. Append-Oriented History

Encounters should rarely be updated after creation.

Preferred behavior:

```text
new evidence
→ new encounter row
```

rather than:

```text
overwrite old evidence
```

This preserves auditability and supports future recalculation.

---

# 32. Canonical State vs Historical Evidence

Canonical current state:

```text
learner_lexeme_state
learner_chunk_state
```

Historical evidence:

```text
encounters
```

If a future mastery algorithm changes, historical encounters may allow state recomputation.

This is a major reason not to throw away encounter history.

---

# 33. `review_queue`

Stores explicit scheduled reviews.

```sql
CREATE TABLE review_queue (
  id TEXT PRIMARY KEY,

  learner_id TEXT NOT NULL,

  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,

  due_at TEXT NOT NULL,
  priority REAL NOT NULL DEFAULT 1.0,

  last_result TEXT,
  scheduling_version TEXT NOT NULL,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (learner_id) REFERENCES users(id)
);
```

Unique item constraint:

```sql
CREATE UNIQUE INDEX idx_review_queue_unique_item
ON review_queue(learner_id, item_type, item_id);
```

---

# 34. Review Queue Indexes

Critical:

```sql
CREATE INDEX idx_review_queue_due
ON review_queue(learner_id, due_at, priority DESC);
```

This supports:

```text
give me all due reviews for this learner
```

efficiently.

---

# 35. Scheduling Version

Persist:

```text
scheduling_version
```

Example:

```text
simple-v1
fsrs-v1
```

This makes algorithm evolution auditable.

A change in scheduling algorithm should not make old state impossible to understand.

---

# 36. `content`

Stores generated or imported learning material.

```sql
CREATE TABLE content (
  id TEXT PRIMARY KEY,

  learner_id TEXT,
  content_type TEXT NOT NULL,

  title TEXT,
  body_text TEXT,

  language TEXT NOT NULL,
  topic TEXT,

  estimated_difficulty REAL,
  known_ratio REAL,
  review_ratio REAL,
  unknown_ratio REAL,

  source_type TEXT NOT NULL,
  source_reference TEXT,

  provider TEXT,
  model TEXT,
  prompt_version TEXT,

  status TEXT NOT NULL,

  metadata_json TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (learner_id) REFERENCES users(id)
);
```

---

# 37. Content Types

Examples:

```text
STORY
DIALOGUE
LISTENING
ARTICLE
EXERCISE
CONVERSATION_SCENARIO
```

Future:

```text
IMPORTED_TEXT
MEDIA_PREP
BOOK_EXCERPT_METADATA
```

---

# 38. Content Source Types

Examples:

```text
GENERATED
CURATED
USER_PROVIDED
IMPORTED
```

This distinction matters for provenance and future copyright/licensing behavior.

---

# 39. Content Status

Recommended:

```text
GENERATING
VALID
INVALID
ARCHIVED
```

Only `VALID` content should normally be shown to the learner.

---

# 40. Content Validation Metadata

Store:

```text
known_ratio
review_ratio
unknown_ratio
```

when available.

This allows later analysis of:

```text
which difficulty ranges actually work best
```

---

# 41. `content_target_items`

Associates lexical targets with content.

```sql
CREATE TABLE content_target_items (
  id TEXT PRIMARY KEY,

  content_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  role TEXT NOT NULL,

  FOREIGN KEY (content_id) REFERENCES content(id)
);
```

Roles:

```text
NEW
REVIEW
REQUIRED
OPTIONAL
```

---

# 42. Content Target Index

```sql
CREATE INDEX idx_content_target_items_content
ON content_target_items(content_id);

CREATE INDEX idx_content_target_items_item
ON content_target_items(item_type, item_id);
```

This enables questions such as:

```text
which stories used "figure out"?
```

---

# 43. `learning_sessions`

Stores Daily Journey and other session-level activity.

```sql
CREATE TABLE learning_sessions (
  id TEXT PRIMARY KEY,

  learner_id TEXT NOT NULL,
  session_type TEXT NOT NULL,

  status TEXT NOT NULL,

  planned_minutes INTEGER,
  actual_seconds INTEGER,

  started_at TEXT,
  completed_at TEXT,

  metadata_json TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (learner_id) REFERENCES users(id)
);
```

---

# 44. Session Types

Examples:

```text
DAILY_JOURNEY
REVIEW_ONLY
STORY_ONLY
SPEAK
PLACEMENT
```

---

# 45. Session Status

Recommended:

```text
PLANNED
IN_PROGRESS
COMPLETED
ABANDONED
FAILED
```

---

# 46. `session_activities`

Stores planned and completed units inside a session.

```sql
CREATE TABLE session_activities (
  id TEXT PRIMARY KEY,

  session_id TEXT NOT NULL,

  activity_type TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,

  status TEXT NOT NULL,

  content_id TEXT,

  started_at TEXT,
  completed_at TEXT,

  metadata_json TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (session_id) REFERENCES learning_sessions(id),
  FOREIGN KEY (content_id) REFERENCES content(id)
);
```

---

# 47. Session Activity Index

```sql
CREATE UNIQUE INDEX idx_session_activity_sequence
ON session_activities(session_id, sequence_number);
```

This preserves activity order.

---

# 48. Resumable Sessions

Persist session progression so closing the app does not necessarily lose the journey.

For `0.1.0`, resume support can be basic.

Example:

```text
IN_PROGRESS session exists
→ offer Resume or Start New
```

---

# 49. `learner_errors`

Stores recurring production patterns.

```sql
CREATE TABLE learner_errors (
  id TEXT PRIMARY KEY,

  learner_id TEXT NOT NULL,

  category TEXT NOT NULL,
  normalized_pattern TEXT NOT NULL,

  example_original TEXT,
  example_preferred TEXT,

  occurrences INTEGER NOT NULL DEFAULT 1,
  severity REAL NOT NULL DEFAULT 0.5,

  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,

  metadata_json TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (learner_id) REFERENCES users(id)
);
```

---

# 50. Error Uniqueness

Prefer aggregation.

Unique index:

```sql
CREATE UNIQUE INDEX idx_learner_errors_pattern
ON learner_errors(learner_id, category, normalized_pattern);
```

Example:

These may map to one pattern:

```text
I did a mistake.
She did a mistake.
He did many mistakes.
```

Normalized:

```text
do + mistake
```

Preferred:

```text
make + mistake
```

---

# 51. Error Categories

Possible:

```text
GRAMMAR
COLLOCATION
WORD_CHOICE
WORD_ORDER
PRONUNCIATION
SPELLING
ARTICLE
PREPOSITION
PHRASAL_VERB
```

---

# 52. `settings`

Simple key-value configuration.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Use only for application settings.

Do not store core learner model state here.

---

# 53. `schema_migrations`

Migration history.

```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

Migration tooling may also provide its own migration table.

Do not duplicate unnecessarily.

---

# 54. Foreign Keys

SQLite foreign keys must be enabled.

At connection startup:

```sql
PRAGMA foreign_keys = ON;
```

Tests must verify that this setting is active.

---

# 55. WAL Mode

Consider:

```sql
PRAGMA journal_mode = WAL;
```

Benefits:

- better read/write concurrency;
- resilient local application behavior.

The implementation should test Windows compatibility before relying on WAL-specific assumptions.

---

# 56. Busy Timeout

Configure a reasonable busy timeout.

Example:

```sql
PRAGMA busy_timeout = 5000;
```

This avoids immediate failures during short lock contention.

---

# 57. Transactions

Use explicit transactions for domain operations.

Example recall submission transaction:

```text
BEGIN
  insert encounter
  update learner state
  upsert review item
  update session activity
COMMIT
```

If any step fails:

```text
ROLLBACK
```

---

# 58. Repository Boundaries

Suggested interfaces:

```ts
interface LearnerProfileRepository {}
interface LexemeRepository {}
interface LearnerLexemeStateRepository {}
interface ChunkRepository {}
interface EncounterRepository {}
interface ReviewRepository {}
interface ContentRepository {}
interface LearningSessionRepository {}
interface LearnerErrorRepository {}
```

Application/domain packages should depend on interfaces, not SQLite details.

---

# 59. Upsert Strategy

Current learner state naturally uses upserts.

Example:

```text
INSERT learner state
ON CONFLICT
UPDATE ...
```

Encounters should not use upsert because they are historical events.

---

# 60. Data Integrity Rules

Important invariants:

```text
score ∈ [0,1]
encounter count >= 0
heard count >= 0
one current state per learner/item
one review queue row per learner/item
one learner profile per user
session sequence numbers unique
```

Enforce invariants at both:

```text
domain validation
database constraints
```

where practical.

---

# 61. Learner State Update Flow

```text
new encounter
      ↓
load current item state
      ↓
learning engine calculates next state
      ↓
review scheduler calculates next due
      ↓
transaction:
  insert encounter
  upsert state
  upsert review queue
      ↓
commit
```

The database never computes mastery itself.

---

# 62. No AI-Owned State

Forbidden flow:

```text
LLM:
"This learner knows this word at 87%."

database:
productive_score = 0.87
```

Preferred:

```text
LLM evaluates open response
      ↓
validated evidence result
      ↓
learning engine maps evidence to state change
      ↓
database stores deterministic result
```

---

# 63. Open-Ended Evaluation Storage

If an LLM evaluates a learner answer, encounter metadata may store:

```json
{
  "evaluator": "nvidia-nim",
  "model": "...",
  "promptVersion": "recall-eval-v1",
  "rawCategory": "PARTIAL",
  "confidence": 0.82
}
```

Do not needlessly store full hidden prompt context.

---

# 64. Placement Data

Placement answers can be represented as encounters:

```text
activity = PLACEMENT
```

This avoids a completely separate evidence system.

A placement session may also have metadata summarizing:

```text
self assessment
questions answered
listening enabled
resulting estimates
```

---

# 65. Receptive Vocabulary Count

Do not persist a single authoritative count that becomes stale.

Prefer deriving it from state thresholds.

Example conceptual query:

```text
count lexemes where receptive mastery >= threshold
```

A cached summary may exist for performance later.

---

# 66. Productive Vocabulary Count

Similarly derive from:

```text
productive_score
```

rather than incrementing a global counter manually.

This avoids state drift.

---

# 67. Mastery State Labels

Labels such as:

```text
NEW
FAMILIAR
RECOGNIZED
UNDERSTOOD
RECALLABLE
USABLE
AUTOMATIC
```

should generally be derived from continuous scores.

Avoid persisting both label and score unless necessary.

If label is cached, define one source of truth.

---

# 68. Content Difficulty

Persist learner-specific difficulty metadata only if tied to a learner.

Example:

```text
content.learner_id
```

A globally reusable content item may require a separate per-learner analysis table later.

For MVP, generated content is usually learner-specific.

---

# 69. Future `content_learner_analysis`

If content becomes reusable:

```sql
CREATE TABLE content_learner_analysis (
  learner_id TEXT NOT NULL,
  content_id TEXT NOT NULL,

  known_ratio REAL,
  unknown_ratio REAL,
  difficulty REAL,

  analyzed_at TEXT NOT NULL,

  PRIMARY KEY (learner_id, content_id)
);
```

Not required for `0.1.0`.

---

# 70. Audio Metadata

Generated audio may be stored on disk.

Optional table:

```sql
CREATE TABLE audio_assets (
  id TEXT PRIMARY KEY,

  content_id TEXT,
  text_hash TEXT NOT NULL,

  provider TEXT,
  voice TEXT,
  speed REAL,

  file_path TEXT NOT NULL,
  duration_ms INTEGER,

  created_at TEXT NOT NULL,

  FOREIGN KEY (content_id) REFERENCES content(id)
);
```

Can be added when TTS lands.

---

# 71. Never Store Large Audio BLOBs by Default

Prefer filesystem storage.

Reasons:

- database remains small;
- backup behavior is simpler;
- streaming/playback easier;
- audio cache can be safely pruned.

SQLite BLOBs are possible but unnecessary for MVP.

---

# 72. Cache vs User Data

Distinguish:

```text
user data
```

from:

```text
reconstructible cache
```

User data:

- progress;
- encounters;
- mastery;
- errors;
- sessions.

Cache:

- TTS audio;
- generated temporary assets;
- reusable analysis.

Deleting cache must not destroy learner progress.

---

# 73. Backup Strategy

The local-first product should eventually support:

```text
gofluent backup
```

or a settings action.

MVP minimum:

Document the database location.

Future backup should include:

```text
database
user-generated/imported persistent files
```

Cache does not need backup.

---

# 74. Export Strategy

Future learner-data export may include JSON.

Example:

```json
{
  "profile": {},
  "lexicalState": [],
  "encounters": [],
  "errors": [],
  "sessions": []
}
```

This supports portability and debugging.

Not required for `0.1.0`.

---

# 75. Database Versioning

Database schema versioning is independent from product SemVer.

Example:

```text
Product: 0.3.0
Schema: 0008
```

Do not assume:

```text
product version == schema version
```

---

# 76. Migration Naming

Recommended:

```text
0001_initial.sql
0002_add_learner_interests.sql
0003_add_content_targets.sql
0004_add_errors.sql
```

Once applied, migrations should not be edited.

Create a new migration instead.

---

# 77. Migration Startup Flow

```text
open database
      ↓
enable foreign keys
      ↓
read migration state
      ↓
apply pending migrations in transaction
      ↓
verify schema
      ↓
start application
```

If migration fails:

```text
do not start normal app flow
```

Show a clear recovery message.

---

# 78. Migration Safety

Avoid:

```text
DROP TABLE learner_lexeme_state
```

without data migration.

Safe pattern:

```text
create replacement table
copy/transform data
validate
rename
```

Backups may be created before risky migrations.

---

# 79. Downgrades

Automatic database downgrade is not required for MVP.

If older GoFluent versions cannot open newer schemas, show:

```text
This database was created by a newer GoFluent version.
Please update GoFluent.
```

Do not silently corrupt data.

---

# 80. Seed Data

Lexical data may be seeded separately.

Examples:

```text
high-frequency English lexemes
basic chunk list
CEFR metadata
```

Do not store huge seed inserts inside every migration.

Use versioned lexical dataset import scripts where appropriate.

---

# 81. Lexical Dataset Version

Consider a metadata table:

```sql
CREATE TABLE dataset_versions (
  dataset_name TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  imported_at TEXT NOT NULL
);
```

This helps track:

```text
frequency dataset v1
chunk dataset v2
```

---

# 82. Lexical Dataset Updates

Changing frequency metadata must not erase learner state.

Stable lexical IDs are important.

If a lexeme's metadata changes:

```text
same lexical concept
→ keep same ID
```

If lexical identity changes materially, migrate carefully.

---

# 83. Normalization

Normalize lexical lookup forms consistently.

Potential normalization:

```text
lowercase
Unicode normalization
trim
apostrophe normalization
```

Do not erase linguistically meaningful distinctions.

Normalization rules belong in lexical-engine code, not SQL triggers.

---

# 84. Search

MVP lexical lookup can use normal indexes.

Future full-text search may use:

```text
SQLite FTS5
```

for:

- content search;
- vocabulary search;
- imported text.

Do not add FTS until needed.

---

# 85. JSON Columns

SQLite JSON stored as `TEXT` may be used for flexible metadata.

Use for:

```text
low-frequency optional metadata
provider metadata
session metadata
```

Do not hide important queryable business state inside JSON.

Bad:

```json
{
  "recallScore": 0.8
}
```

inside one generic learner-state JSON blob.

Good:

`recall_score` as a real column.

---

# 86. Query Patterns

Core queries should be designed intentionally.

Examples:

```text
due reviews for learner
weakest high-value lexemes
recent encounters
receptive vocabulary count
productive vocabulary count
recent errors
session resume
content by target item
```

Indexes should directly support these.

---

# 87. Due Review Query

Conceptually:

```sql
SELECT *
FROM review_queue
WHERE learner_id = ?
  AND due_at <= ?
ORDER BY priority DESC, due_at ASC
LIMIT ?;
```

Critical index:

```text
learner_id + due_at + priority
```

---

# 88. Weak Item Query

Possible:

```sql
SELECT *
FROM learner_lexeme_state
WHERE learner_id = ?
ORDER BY recall_score ASC
LIMIT ?;
```

Eventually learning value will combine state and lexical metadata in application logic.

---

# 89. Recent Encounter Query

```sql
SELECT *
FROM encounters
WHERE learner_id = ?
ORDER BY created_at DESC
LIMIT ?;
```

This supports session planning and progress.

---

# 90. Data Access Performance

SQLite should easily handle MVP scale.

Expected local scale:

```text
10k–100k encounters
thousands of lexical states
hundreds/thousands of content records
```

No sharding or distributed database is needed.

---

# 91. Cleanup Policies

Historical encounters should not be casually deleted.

Caches may be pruned.

Generated content may be archived.

Possible future retention:

```text
keep learner evidence
prune old reconstructible AI artifacts
```

---

# 92. Soft Delete

Do not add `deleted_at` to every table by default.

Use soft delete only where product behavior requires restoration/audit.

For MVP, most entities can be immutable or physically removed when clearly safe.

---

# 93. Privacy

The database may contain sensitive learner data such as:

```text
personal interests
conversation summaries
error history
learning behavior
```

Do not store unnecessary personally identifying information.

MVP should not require:

```text
full name
email
birth date
address
```

unless future account features need them.

---

# 94. Conversation Storage

Do not store entire conversations by default unless needed.

Prefer structured evidence:

```text
target items used
errors detected
encounters
session summary
```

If raw conversation history is stored later, make retention intentional.

---

# 95. Speech Storage

Raw microphone recordings should not be persisted by default.

Preferred flow:

```text
capture
→ transcribe
→ evaluate
→ discard temporary recording
```

Persist audio only if explicitly required by a feature.

---

# 96. Database Logging

Do not log entire SQL rows containing learner content in normal logs.

Debug logs can include:

```text
query name
duration
row count
```

instead of raw private data.

---

# 97. Testing the Database

Tests should use isolated databases.

Options:

```text
temporary file SQLite
in-memory SQLite
```

Use real SQLite behavior for repository integration tests.

Do not mock every SQL query.

---

# 98. Migration Tests

CI should test:

```text
empty DB → latest schema
```

and, as migrations grow:

```text
representative old schema → latest schema
```

This protects learner progress.

---

# 99. Repository Tests

Important repository tests:

```text
create/load learner profile
upsert learner lexeme state
append encounter
due review ordering
session transaction
content target lookup
error aggregation
```

---

# 100. Transaction Tests

Test failure rollback.

Example:

```text
encounter inserted
state update fails
```

Expected:

```text
no partial transaction remains
```

---

# 101. Database Connection Lifecycle

One local application process can generally use a shared database connection or small connection abstraction.

Avoid large connection pools for SQLite.

The DB layer should own:

```text
open
configure
migrate
close
```

---

# 102. Graceful Shutdown

On application exit:

```text
finish/cancel pending DB work
close database cleanly
```

Ctrl+C should not corrupt active state.

SQLite transactions must not remain partially open.

---

# 103. Future Cloud Migration

Repository interfaces should make future remote persistence possible.

Potential later architecture:

```text
Local SQLite
     +
Cloud API
     +
Sync engine
```

Do not design a full sync system now.

But use stable string IDs and timestamps to avoid obvious blockers.

---

# 104. Future Sync Metadata

Possible future fields:

```text
created_at
updated_at
device_id
sync_version
deleted_at
```

Do not add all sync fields until cloud sync is actually planned.

---

# 105. Future Multiple Profiles

A `users` abstraction enables multiple local learner profiles later.

MVP can automatically load the only user.

Future:

```text
profile selector
```

should not require schema redesign.

---

# 106. Database Anti-Patterns

Do not:

```text
store the entire learner model as one JSON blob
store LLM responses as canonical mastery
use auto-increment IDs everywhere if sync is expected later
hardcode database path
skip migrations
reset DB on schema changes
store cache as critical user data
put large audio BLOBs into DB by default
query SQLite directly from Ink components
hide core fields inside metadata_json
```

---

# 107. Recommended Initial Migration

`0001_initial.sql` should include only what is required for the first vertical slice:

```text
users
learner_profiles
learner_interests
lexemes
lexeme_forms
chunks
learner_lexeme_state
learner_chunk_state
encounters
review_queue
content
content_target_items
learning_sessions
session_activities
settings
```

`learner_errors` may land in the initial migration or early `0.1.x`.

Avoid overloading the first migration with future-only tables.

---

# 108. Initial Vertical Slice Data Flow

```text
first launch
   ↓
create user
   ↓
create learner profile
   ↓
placement creates encounters
   ↓
initialize lexical states
   ↓
create Daily Journey session
   ↓
generate story
   ↓
store content
   ↓
learner interacts
   ↓
append encounters
   ↓
update lexical states
   ↓
schedule reviews
   ↓
complete session
```

This flow should be fully represented by the database.

---

# 109. Definition of Done for Database Changes

A database change is complete when:

```text
migration exists
migration is tested
repository changes exist
domain types updated
indexes considered
rollback behavior considered
learner data preserved
Windows verified
Linux verified
docs updated
```

---

# 110. Initial TypeScript Repository Contracts

Example:

```ts
export interface EncounterRepository {
  append(encounter: Encounter): Promise<void>;

  listRecent(
    learnerId: string,
    limit: number
  ): Promise<Encounter[]>;
}
```

Example:

```ts
export interface LearnerLexemeStateRepository {
  get(
    learnerId: string,
    lexemeId: string
  ): Promise<LearnerLexemeState | null>;

  upsert(state: LearnerLexemeState): Promise<void>;
}
```

---

# 111. Unit of Work

For multi-repository transactions, consider a lightweight unit-of-work abstraction.

Example:

```ts
interface UnitOfWork {
  transaction<T>(
    fn: (tx: TransactionContext) => Promise<T>
  ): Promise<T>;
}
```

Do not build a complex ORM-style unit of work unless needed.

---

# 112. ORM / Query Builder Decision

The architecture does not require a heavy ORM.

Acceptable options include:

```text
Drizzle ORM
Kysely
better-sqlite3 with typed repositories
SQLite driver + explicit SQL
```

Selection should prioritize:

- TypeScript safety;
- migration clarity;
- SQLite reliability;
- cross-platform installation;
- low runtime complexity.

Do not choose an ORM merely for abstraction aesthetics.

---

# 113. Native Dependency Risk

Because Windows support is mandatory, database driver selection must be tested for:

```text
Windows installation
Node 24 compatibility
prebuilt binaries
CI reliability
```

Avoid forcing users to install a C/C++ build toolchain if practical.

---

# 114. Schema Review Checklist

Before adding a table or column, ask:

1. Is this canonical state or derived state?
2. Does this belong in structured columns or metadata JSON?
3. How will it be queried?
4. What index does that query require?
5. Can it be reconstructed?
6. Does it contain learner-sensitive data?
7. How will it migrate?
8. Does the domain own this state?
9. Is it really required in the MVP?

---

# 115. Database Product Principle

The GoFluent database should answer:

```text
What does this learner know?
What evidence supports that belief?
What should they review next?
What have they encountered recently?
What can they actively use?
What are they repeatedly getting wrong?
What content is appropriate next?
```

If the schema cannot answer those questions reliably, it is not serving the product.

---

# 116. Final Principle

The database is the durable memory of GoFluent.

The LLM may forget between requests.

The learner model must not.

The core loop is:

```text
Encounter
   ↓
Evidence
   ↓
Learner State
   ↓
Review / Content Selection
   ↓
New Encounter
```

SQLite exists to preserve that loop safely, transparently, and across every application session.
