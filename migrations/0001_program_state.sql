CREATE TABLE IF NOT EXISTS program_state (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
