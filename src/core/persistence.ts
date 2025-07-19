import { Result, ok, err } from '../types/result';
import { SwarmState } from '../types/cli';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

const STATE_DIR = '.swarm-conductor';

// Pure function to get state file path
function getStateFilePath(sessionId: string): string {
  return join(STATE_DIR, `${sessionId}.json`);
}

// Save state to disk
export async function saveState(state: SwarmState): Promise<Result<void, Error>> {
  try {
    const filePath = getStateFilePath(state.id);
    const data = JSON.stringify(state, null, 2);
    
    // Ensure directory exists
    await ensureDirectory(STATE_DIR);
    
    // Write state to file
    await writeFile(filePath, data, 'utf-8');
    
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Load state from disk
export async function loadState(sessionId: string): Promise<Result<SwarmState, Error>> {
  try {
    const filePath = getStateFilePath(sessionId);
    const data = await readFile(filePath, 'utf-8');
    const state = JSON.parse(data) as SwarmState;
    
    return ok(state);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Helper to ensure directory exists
async function ensureDirectory(dir: string): Promise<void> {
  const { mkdir } = await import('fs/promises');
  await mkdir(dir, { recursive: true });
}