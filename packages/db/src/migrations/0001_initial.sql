-- 0001_initial.sql — vertical-slice schema (DATABASE.md §107)

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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

CREATE TABLE learner_interests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  interest TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  created_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_learner_interests_user_interest
ON learner_interests(user_id, interest);

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

CREATE UNIQUE INDEX idx_lexemes_language_lemma_pos
ON lexemes(language, lemma, part_of_speech);

CREATE TABLE lexeme_forms (
  id TEXT PRIMARY KEY,
  lexeme_id TEXT NOT NULL,
  form TEXT NOT NULL,
  normalized_form TEXT NOT NULL,

  FOREIGN KEY (lexeme_id) REFERENCES lexemes(id)
);

CREATE INDEX idx_lexeme_forms_normalized
ON lexeme_forms(normalized_form);

CREATE INDEX idx_lexeme_forms_lexeme
ON lexeme_forms(lexeme_id);

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

CREATE UNIQUE INDEX idx_chunks_language_normalized
ON chunks(language, normalized_text);

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

CREATE INDEX idx_learner_lexeme_next_review
ON learner_lexeme_state(learner_id, next_review_at);

CREATE INDEX idx_learner_lexeme_productive
ON learner_lexeme_state(learner_id, productive_score);

CREATE INDEX idx_learner_lexeme_recall
ON learner_lexeme_state(learner_id, recall_score);

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
  FOREIGN KEY (chunk_id) REFERENCES chunks(id),

  CHECK (reading_recognition BETWEEN 0.0 AND 1.0),
  CHECK (listening_recognition BETWEEN 0.0 AND 1.0),
  CHECK (recall_score BETWEEN 0.0 AND 1.0),
  CHECK (productive_score BETWEEN 0.0 AND 1.0)
);

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

CREATE INDEX idx_encounters_learner_created
ON encounters(learner_id, created_at DESC);

CREATE INDEX idx_encounters_item
ON encounters(learner_id, item_type, item_id, created_at DESC);

CREATE INDEX idx_encounters_session
ON encounters(session_id);

CREATE INDEX idx_encounters_content
ON encounters(content_id);

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

CREATE UNIQUE INDEX idx_review_queue_unique_item
ON review_queue(learner_id, item_type, item_id);

CREATE INDEX idx_review_queue_due
ON review_queue(learner_id, due_at, priority DESC);

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

CREATE TABLE content_target_items (
  id TEXT PRIMARY KEY,

  content_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  role TEXT NOT NULL,

  FOREIGN KEY (content_id) REFERENCES content(id)
);

CREATE INDEX idx_content_target_items_content
ON content_target_items(content_id);

CREATE INDEX idx_content_target_items_item
ON content_target_items(item_type, item_id);

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

CREATE UNIQUE INDEX idx_session_activity_sequence
ON session_activities(session_id, sequence_number);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
