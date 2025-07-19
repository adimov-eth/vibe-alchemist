import { Database } from "bun:sqlite";
import { randomBytes } from "crypto";
import { Result, ok, err } from "../types";
import type { 
  Session, Sprint, Artifact, Checkpoint, 
  StateRepository, SprintResult, CheckpointState 
} from "../types/state";
import { runMigrations } from "./migrations";

export class SQLiteStateRepository implements StateRepository {
  private db: Database;

  constructor(dbPath: string = ".swarm-conductor/state.db") {
    this.db = new Database(dbPath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
  }

  async initialize(): Promise<Result<void, Error>> {
    return runMigrations(this.db);
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}`;
  }

  // Session operations
  async createSession(taskId: string, metadata: Record<string, unknown> = {}): Promise<Result<Session, Error>> {
    try {
      const id = this.generateId('session');
      const now = new Date();
      
      this.db.prepare(`
        INSERT INTO sessions (id, task_id, metadata, started_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, taskId, JSON.stringify(metadata), now.toISOString(), now.toISOString());

      const session: Session = {
        id,
        taskId,
        sprintCount: 0,
        confidenceLevel: 0,
        status: 'active',
        startedAt: now,
        updatedAt: now,
        metadata
      };

      return ok(session);
    } catch (error) {
      return err(new Error(`Failed to create session: ${error}`));
    }
  }

  async getSession(id: string): Promise<Result<Session | null, Error>> {
    try {
      const row = this.db.prepare(`
        SELECT * FROM sessions WHERE id = ?
      `).get(id) as any;

      if (!row) return ok(null);

      const session: Session = {
        id: row.id,
        taskId: row.task_id,
        sprintCount: row.sprint_count,
        confidenceLevel: row.confidence_level,
        status: row.status,
        startedAt: new Date(row.started_at),
        updatedAt: new Date(row.updated_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        metadata: JSON.parse(row.metadata || '{}')
      };

      return ok(session);
    } catch (error) {
      return err(new Error(`Failed to get session: ${error}`));
    }
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Result<Session, Error>> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.sprintCount !== undefined) {
        fields.push('sprint_count = ?');
        values.push(updates.sprintCount);
      }
      if (updates.confidenceLevel !== undefined) {
        fields.push('confidence_level = ?');
        values.push(updates.confidenceLevel);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.completedAt !== undefined) {
        fields.push('completed_at = ?');
        values.push(updates.completedAt);
      }
      if (updates.metadata !== undefined) {
        fields.push('metadata = ?');
        values.push(JSON.stringify(updates.metadata));
      }

      values.push(id);

      this.db.prepare(`
        UPDATE sessions 
        SET ${fields.join(', ')}
        WHERE id = ?
      `).run(...values);

      return this.getSession(id) as Promise<Result<Session, Error>>;
    } catch (error) {
      return err(new Error(`Failed to update session: ${error}`));
    }
  }

  async listActiveSessions(): Promise<Result<Session[], Error>> {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM sessions 
        WHERE status = 'active' 
        ORDER BY updated_at DESC
      `).all() as any[];

      const sessions = rows.map(row => ({
        id: row.id,
        taskId: row.task_id,
        sprintCount: row.sprint_count,
        confidenceLevel: row.confidence_level,
        status: row.status,
        startedAt: new Date(row.started_at),
        updatedAt: new Date(row.updated_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        metadata: JSON.parse(row.metadata || '{}')
      }));

      return ok(sessions);
    } catch (error) {
      return err(new Error(`Failed to list active sessions: ${error}`));
    }
  }

  // Sprint operations
  async createSprint(sessionId: string, objective: string): Promise<Result<Sprint, Error>> {
    try {
      const id = this.generateId('sprint');
      
      // Get current sprint count
      const countResult = this.db.prepare(`
        SELECT COUNT(*) as count FROM sprints WHERE session_id = ?
      `).get(sessionId) as { count: number };
      
      const sprintNumber = countResult.count + 1;
      
      this.db.prepare(`
        INSERT INTO sprints (id, session_id, sprint_number, objective)
        VALUES (?, ?, ?, ?)
      `).run(id, sessionId, sprintNumber, objective);

      const sprint: Sprint = {
        id,
        sessionId,
        sprintNumber,
        objective,
        confidence: 0,
        status: 'planning',
        startedAt: new Date()
      };

      return ok(sprint);
    } catch (error) {
      return err(new Error(`Failed to create sprint: ${error}`));
    }
  }

  async updateSprint(id: string, updates: Partial<Sprint>): Promise<Result<Sprint, Error>> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.confidence !== undefined) {
        fields.push('confidence = ?');
        values.push(updates.confidence);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.completedAt !== undefined) {
        fields.push('completed_at = ?');
        values.push(updates.completedAt);
      }
      if (updates.result !== undefined) {
        fields.push('result = ?');
        values.push(JSON.stringify(updates.result));
      }

      values.push(id);

      this.db.prepare(`
        UPDATE sprints 
        SET ${fields.join(', ')}
        WHERE id = ?
      `).run(...values);

      const row = this.db.prepare(`
        SELECT * FROM sprints WHERE id = ?
      `).get(id) as any;

      const sprint: Sprint = {
        id: row.id,
        sessionId: row.session_id,
        sprintNumber: row.sprint_number,
        objective: row.objective,
        confidence: row.confidence,
        status: row.status,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        result: row.result ? JSON.parse(row.result) : undefined
      };

      return ok(sprint);
    } catch (error) {
      return err(new Error(`Failed to update sprint: ${error}`));
    }
  }

  async getSprintsBySession(sessionId: string): Promise<Result<Sprint[], Error>> {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM sprints 
        WHERE session_id = ? 
        ORDER BY sprint_number
      `).all(sessionId) as any[];

      const sprints = rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        sprintNumber: row.sprint_number,
        objective: row.objective,
        confidence: row.confidence,
        status: row.status,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        result: row.result ? JSON.parse(row.result) : undefined
      }));

      return ok(sprints);
    } catch (error) {
      return err(new Error(`Failed to get sprints: ${error}`));
    }
  }

  // Artifact operations
  async saveArtifact(sprintId: string, artifact: Omit<Artifact, 'id' | 'createdAt'>): Promise<Result<Artifact, Error>> {
    try {
      const id = this.generateId('artifact');
      const now = new Date();
      
      this.db.prepare(`
        INSERT INTO artifacts (id, sprint_id, type, path, content, checksum)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, sprintId, artifact.type, artifact.path, artifact.content || null, artifact.checksum || null);

      return ok({
        id,
        ...artifact,
        sprintId,
        createdAt: now
      });
    } catch (error) {
      return err(new Error(`Failed to save artifact: ${error}`));
    }
  }

  async getArtifactsBySprint(sprintId: string): Promise<Result<Artifact[], Error>> {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM artifacts 
        WHERE sprint_id = ? 
        ORDER BY created_at
      `).all(sprintId) as any[];

      const artifacts = rows.map(row => ({
        id: row.id,
        sprintId: row.sprint_id,
        type: row.type,
        path: row.path,
        content: row.content,
        checksum: row.checksum,
        createdAt: new Date(row.created_at)
      }));

      return ok(artifacts);
    } catch (error) {
      return err(new Error(`Failed to get artifacts: ${error}`));
    }
  }

  // Checkpoint operations
  async createCheckpoint(checkpoint: Omit<Checkpoint, 'id' | 'createdAt'>): Promise<Result<Checkpoint, Error>> {
    try {
      const id = this.generateId('checkpoint');
      const now = new Date();
      
      this.db.prepare(`
        INSERT INTO checkpoints (id, session_id, sprint_id, name, description, state)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id, 
        checkpoint.sessionId, 
        checkpoint.sprintId, 
        checkpoint.name, 
        checkpoint.description || null,
        JSON.stringify(checkpoint.state)
      );

      return ok({
        id,
        ...checkpoint,
        createdAt: now
      });
    } catch (error) {
      return err(new Error(`Failed to create checkpoint: ${error}`));
    }
  }

  async loadCheckpoint(id: string): Promise<Result<Checkpoint | null, Error>> {
    try {
      const row = this.db.prepare(`
        SELECT * FROM checkpoints WHERE id = ?
      `).get(id) as any;

      if (!row) return ok(null);

      const checkpoint: Checkpoint = {
        id: row.id,
        sessionId: row.session_id,
        sprintId: row.sprint_id,
        name: row.name,
        description: row.description,
        state: JSON.parse(row.state),
        createdAt: new Date(row.created_at)
      };

      return ok(checkpoint);
    } catch (error) {
      return err(new Error(`Failed to load checkpoint: ${error}`));
    }
  }

  async listCheckpoints(sessionId: string): Promise<Result<Checkpoint[], Error>> {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM checkpoints 
        WHERE session_id = ? 
        ORDER BY created_at DESC
      `).all(sessionId) as any[];

      const checkpoints = rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        sprintId: row.sprint_id,
        name: row.name,
        description: row.description,
        state: JSON.parse(row.state),
        createdAt: new Date(row.created_at)
      }));

      return ok(checkpoints);
    } catch (error) {
      return err(new Error(`Failed to list checkpoints: ${error}`));
    }
  }

  // Cleanup operations
  async cleanupOldSessions(maxAge: number): Promise<Result<number, Error>> {
    try {
      const cutoff = new Date(Date.now() - maxAge);
      
      const result = this.db.prepare(`
        DELETE FROM sessions 
        WHERE status IN ('completed', 'failed', 'cancelled') 
        AND updated_at < ?
      `).run(cutoff.toISOString());

      return ok(result.changes);
    } catch (error) {
      return err(new Error(`Failed to cleanup sessions: ${error}`));
    }
  }

  async vacuum(): Promise<Result<void, Error>> {
    try {
      this.db.exec("VACUUM");
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to vacuum database: ${error}`));
    }
  }

  close(): void {
    this.db.close();
  }
}