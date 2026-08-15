-- 0002_audio_assets.sql — TTS audio cache metadata (DATABASE.md §70, Phase 3)

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

CREATE INDEX idx_audio_assets_cache_key
ON audio_assets(text_hash, voice, speed, provider);

CREATE INDEX idx_audio_assets_content
ON audio_assets(content_id);
