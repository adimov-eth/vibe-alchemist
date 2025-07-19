import { Command } from 'commander';
import { Result, ok, err } from '../../types/result';
import { SwarmState } from '../../types/cli';
import { createInitialState } from '../../core/state';
import { saveState } from '../../core/persistence';

interface InitOptions {
  context?: string;
  agents?: number;
  mcpPort?: number;
}

// Pure function to create init command
export function initCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize a new swarm conductor session')
    .option('-c, --context <string>', 'Initial context for the swarm')
    .option('-a, --agents <number>', 'Number of agents to spawn', '5')
    .option('-p, --mcp-port <number>', 'Port for MCP server', '3000')
    .action(async (options: InitOptions) => {
      const result = await initializeSwarm(options);
      if (result.kind === 'err') {
        console.error('Failed to initialize swarm:', result.error.message);
        process.exit(1);
      }
      console.log('Swarm initialized successfully!');
      console.log('Session ID:', result.value.id);
      console.log('To start the swarm, run: swarm-conductor start', result.value.id);
    });

  return command;
}

// Pure function to initialize a new swarm
async function initializeSwarm(options: InitOptions): Promise<Result<SwarmState, Error>> {
  try {
    // Create initial state
    const initialState = createInitialState({
      context: options.context || 'No context provided',
      agentCount: parseInt(String(options.agents), 10),
    });

    // Save state to disk
    const saveResult = await saveState(initialState);
    if (saveResult.kind === 'err') {
      return saveResult;
    }

    return ok(initialState);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}