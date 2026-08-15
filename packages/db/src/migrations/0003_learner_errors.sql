-- 0003_learner_errors.sql — recurring production error memory (DATABASE.md §49-51, Phase 4)

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

CREATE UNIQUE INDEX idx_learner_errors_pattern
ON learner_errors(learner_id, category, normalized_pattern);

CREATE INDEX idx_learner_errors_recent
ON learner_errors(learner_id, last_seen_at DESC);
