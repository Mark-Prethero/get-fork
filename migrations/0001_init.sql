CREATE TABLE experiments (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  config_json TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  mission_snapshot_json TEXT NOT NULL,
  config_version TEXT NOT NULL,
  build_id TEXT NOT NULL,
  actual_device_json TEXT,
  status TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  parent_run_id TEXT,
  outcome_json TEXT,
  session_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  client_event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  UNIQUE (run_id, client_event_id)
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  type TEXT NOT NULL,
  storage_reference TEXT NOT NULL,
  content_type TEXT,
  captured_at TEXT NOT NULL,
  available INTEGER NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE observations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  trace TEXT NOT NULL,
  commentary_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  action TEXT NOT NULL,
  selected_variant_id TEXT,
  rationale TEXT NOT NULL,
  evidence_snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE chat_calls (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  run_id TEXT,
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL,
  error TEXT
);

CREATE TABLE syntheses (
  snapshot_hash TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  model TEXT
);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX events_run_seq ON events (run_id, sequence);
CREATE INDEX runs_pair ON runs (profile_id, variant_id, created_at);
CREATE INDEX artifacts_run ON artifacts (run_id, captured_at);
