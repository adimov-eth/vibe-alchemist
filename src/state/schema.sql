-- Swarm Conductor State Schema
-- Version: 1.0.0

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  sprint_count INTEGER DEFAULT 0,
  confidence_level REAL DEFAULT 0.0,
  status TEXT CHECK(status IN ('active', 'completed', 'failed', 'cancelled')) DEFAULT 'active',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  metadata TEXT -- JSON
);

-- Sprints table
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sprint_number INTEGER NOT NULL,
  objective TEXT NOT NULL,
  confidence REAL DEFAULT 0.0,
  status TEXT CHECK(status IN ('planning', 'executing', 'completed', 'failed')) DEFAULT 'planning',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  result TEXT, -- JSON
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, sprint_number)
);

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  sprint_id TEXT NOT NULL,
  type TEXT CHECK(type IN ('file', 'directory', 'command', 'memory')) NOT NULL,
  path TEXT NOT NULL,
  content TEXT,
  checksum TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE
);

-- Checkpoints table
CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sprint_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_sprints_session_id ON sprints(session_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_sprint_id ON artifacts(sprint_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_session_id ON checkpoints(session_id);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_sessions_timestamp 
AFTER UPDATE ON sessions
BEGIN
  UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;