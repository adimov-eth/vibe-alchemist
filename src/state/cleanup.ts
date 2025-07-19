import { Result, ok, err, isOk } from "../types/result";
import type { StateRepository } from "../types/state";

export interface CleanupOptions {
  maxSessionAge?: number; // milliseconds
  maxCheckpointAge?: number;
  vacuumAfterCleanup?: boolean;
}

const DEFAULT_OPTIONS: CleanupOptions = {
  maxSessionAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxCheckpointAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  vacuumAfterCleanup: true
};

export class StateCleanup {
  constructor(
    private repository: StateRepository,
    private options: CleanupOptions = DEFAULT_OPTIONS
  ) {}

  async cleanup(): Promise<Result<CleanupStats, Error>> {
    const stats: CleanupStats = {
      sessionsDeleted: 0,
      checkpointsDeleted: 0,
      spaceReclaimed: 0
    };

    // Clean up old sessions
    if (this.options.maxSessionAge) {
      const result = await this.repository.cleanupOldSessions(this.options.maxSessionAge);
      if (!isOk(result)) return result as Result<CleanupStats, Error>;
      stats.sessionsDeleted = result.value;
    }

    // Vacuum if requested
    if (this.options.vacuumAfterCleanup) {
      const vacuumResult = await this.repository.vacuum();
      if (!isOk(vacuumResult)) return vacuumResult as Result<CleanupStats, Error>;
    }

    return ok(stats);
  }

  scheduleCleanup(intervalMs: number): () => void {
    const interval = setInterval(async () => {
      const result = await this.cleanup();
      if (!isOk(result)) {
        console.error('Cleanup failed:', (result as any).error);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }
}

export interface CleanupStats {
  sessionsDeleted: number;
  checkpointsDeleted: number;
  spaceReclaimed: number;
}