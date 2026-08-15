-- 0004_imported_content.sql — "Learn From Anything" ingestion records (DATABASE.md §7, Phase 5)

CREATE TABLE imported_content (
  id TEXT PRIMARY KEY,

  learner_id TEXT NOT NULL,
  content_id TEXT,

  title TEXT,
  raw_text TEXT NOT NULL,
  language TEXT NOT NULL,

  estimated_difficulty REAL,
  known_ratio REAL,
  unknown_ratio REAL,

  metadata_json TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (learner_id) REFERENCES users(id),
  FOREIGN KEY (content_id) REFERENCES content(id)
);

CREATE INDEX idx_imported_content_learner
ON imported_content(learner_id, created_at DESC);
