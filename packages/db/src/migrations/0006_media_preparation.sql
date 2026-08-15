-- 0006_media_preparation.sql — "Prepare Me" pre-immersion records (DATABASE.md §7, Phase 7)

CREATE TABLE media_preparation (
  id TEXT PRIMARY KEY,

  learner_id TEXT NOT NULL,

  title TEXT NOT NULL,
  transcript_excerpt TEXT NOT NULL,
  language TEXT NOT NULL,

  estimated_comprehension REAL NOT NULL,
  high_value_lexeme_ids_json TEXT NOT NULL,
  prepared_count INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (learner_id) REFERENCES users(id),

  CHECK (estimated_comprehension BETWEEN 0.0 AND 1.0)
);

CREATE INDEX idx_media_preparation_learner
ON media_preparation(learner_id, created_at DESC);
