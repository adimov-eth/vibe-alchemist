import type { Result } from './result';

// Session represents a single Swarm Conductor session
export interface Session {
  id: string;
  taskId: string;
  sprintCount: number;
  confidenceLevel: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

// Sprint represents a single execution cycle
export interface Sprint {
  id: string;
  sessionId: string;
  sprintNumber: number;
  objective: string;
  confidence: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  result?: SprintResult;
}

// SprintResult captures the outcome of a sprint
export interface SprintResult {
  success: boolean;
  output: string;
  artifacts: Artifact[];
  metrics: SprintMetrics;
  nextSteps?: string[];
}

// Artifact represents a file or resource created during a sprint
export interface Artifact {
  id: string;
  sprintId: string;
  type: 'file' | 'directory' | 'command' | 'memory';
  path: string;
  content?: string;
  checksum?: string;
  createdAt: Date;
}

// SprintMetrics captures performance data
export interface SprintMetrics {
  duration: number;
  tokenCount: number;
  agentCount: number;
  memoryUsage: number;
  errorCount: number;
}

// Checkpoint represents a saved state
export interface Checkpoint {
  id: string;
  sessionId: string;
  sprintId: string;
  name: string;
  description?: string;
  state: CheckpointState;
  createdAt: Date;
}

// CheckpointState captures the full state at a point in time
export interface CheckpointState {
  session: Session;
  sprints: Sprint[];
  artifacts: Artifact[];
  memory: Record<string, unknown>;
}

// StateRepository interface
export interface StateRepository {
  // Session operations
  createSession(taskId: string, metadata?: Record<string, unknown>): Promise<Result<Session, Error>>;
  getSession(id: string): Promise<Result<Session | null, Error>>;
  updateSession(id: string, updates: Partial<Session>): Promise<Result<Session, Error>>;
  listActiveSessions(): Promise<Result<Session[], Error>>;
  
  // Sprint operations
  createSprint(sessionId: string, objective: string): Promise<Result<Sprint, Error>>;
  updateSprint(id: string, updates: Partial<Sprint>): Promise<Result<Sprint, Error>>;
  getSprintsBySession(sessionId: string): Promise<Result<Sprint[], Error>>;
  
  // Artifact operations
  saveArtifact(sprintId: string, artifact: Omit<Artifact, 'id' | 'createdAt'>): Promise<Result<Artifact, Error>>;
  getArtifactsBySprint(sprintId: string): Promise<Result<Artifact[], Error>>;
  
  // Checkpoint operations
  createCheckpoint(checkpoint: Omit<Checkpoint, 'id' | 'createdAt'>): Promise<Result<Checkpoint, Error>>;
  loadCheckpoint(id: string): Promise<Result<Checkpoint | null, Error>>;
  listCheckpoints(sessionId: string): Promise<Result<Checkpoint[], Error>>;
  
  // Cleanup operations
  cleanupOldSessions(maxAge: number): Promise<Result<number, Error>>;
  vacuum(): Promise<Result<void, Error>>;
}