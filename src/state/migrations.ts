import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { Result, ok, err, isOk } from "../types";

interface Migration {
  version: number;
  name: string;
  up: string;
  down?: string;
}

// Track applied migrations
const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

export class MigrationRunner {
  constructor(private db: Database) {}

  async initialize(): Promise<Result<void, Error>> {
    try {
      this.db.exec(MIGRATIONS_TABLE);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to initialize migrations: ${error}`));
    }
  }

  async getCurrentVersion(): Promise<Result<number, Error>> {
    try {
      const result = this.db.query<{ version: number }, []>(
        "SELECT MAX(version) as version FROM migrations"
      ).get();
      return ok(result?.version || 0);
    } catch (error) {
      return err(new Error(`Failed to get current version: ${error}`));
    }
  }

  async applyMigration(migration: Migration): Promise<Result<void, Error>> {
    const tx = this.db.transaction(() => {
      // Apply the migration
      this.db.exec(migration.up);
      
      // Record it
      this.db.prepare(
        "INSERT INTO migrations (version, name) VALUES (?, ?)"
      ).run(migration.version, migration.name);
    });

    try {
      tx();
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to apply migration ${migration.name}: ${error}`));
    }
  }

  async migrate(migrations: Migration[]): Promise<Result<void, Error>> {
    const versionResult = await this.getCurrentVersion();
    if (!isOk(versionResult)) return versionResult;

    const currentVersion = versionResult.value;
    const pending = migrations
      .filter(m => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);

    for (const migration of pending) {
      const result = await this.applyMigration(migration);
      if (!isOk(result)) return result;
    }

    return ok(undefined);
  }
}

// Define migrations
export const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: readFileSync(join(__dirname, "schema.sql"), "utf8")
  }
];

// Helper to run all migrations
export async function runMigrations(db: Database): Promise<Result<void, Error>> {
  const runner = new MigrationRunner(db);
  
  const initResult = await runner.initialize();
  if (!isOk(initResult)) return initResult as Result<void, Error>;

  return runner.migrate(migrations);
}