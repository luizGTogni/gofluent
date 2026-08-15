-- 0005_worlds.sql — Worlds, World Progress, Boss Challenges (DATABASE.md §7, Phase 6)

CREATE TABLE worlds (
  id TEXT PRIMARY KEY,

  language TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ordering INTEGER NOT NULL DEFAULT 0,

  metadata_json TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_worlds_language_key
ON worlds(language, key);

CREATE TABLE world_progress (
  learner_id TEXT NOT NULL,
  world_id TEXT NOT NULL,

  mastery_score REAL NOT NULL DEFAULT 0.0,
  boss_challenge_completed INTEGER NOT NULL DEFAULT 0,

  last_activity_at TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (learner_id, world_id),

  FOREIGN KEY (learner_id) REFERENCES users(id),
  FOREIGN KEY (world_id) REFERENCES worlds(id),

  CHECK (mastery_score BETWEEN 0.0 AND 1.0)
);

CREATE TABLE boss_challenges (
  id TEXT PRIMARY KEY,

  world_id TEXT NOT NULL,
  language TEXT NOT NULL,
  key TEXT NOT NULL,

  title TEXT NOT NULL,
  scenario TEXT NOT NULL,
  metadata_json TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (world_id) REFERENCES worlds(id)
);

CREATE UNIQUE INDEX idx_boss_challenges_world_key
ON boss_challenges(world_id, key);

CREATE TABLE boss_challenge_attempts (
  id TEXT PRIMARY KEY,

  learner_id TEXT NOT NULL,
  boss_challenge_id TEXT NOT NULL,
  session_id TEXT,

  task_completion REAL NOT NULL,
  comprehension REAL NOT NULL,
  target_phrase_usage REAL NOT NULL,
  ability_to_continue REAL NOT NULL,

  result TEXT NOT NULL,
  feedback TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (learner_id) REFERENCES users(id),
  FOREIGN KEY (boss_challenge_id) REFERENCES boss_challenges(id)
);

CREATE INDEX idx_boss_challenge_attempts_learner
ON boss_challenge_attempts(learner_id, created_at DESC);

CREATE INDEX idx_boss_challenge_attempts_challenge
ON boss_challenge_attempts(learner_id, boss_challenge_id, created_at DESC);
