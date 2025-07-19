import { Command } from 'commander';
import { Result, err, isErr } from '../../types';
import { SwarmState } from '../../types/cli';
import { loadState } from '../../core/persistence';
import { runSwarm } from '../../core/conductor';

interface StartOptions {
  debug?: boolean;
  mcpPort?: number;
}

// Pure function to create start command
export function startCommand(): Command {
  const command = new Command('start');

  command
    .description('Start a swarm conductor session')
    .argument('<session-id>', 'Session ID to start')
    .option('-d, --debug', 'Enable debug mode')
    .option('-p, --mcp-port <number>', 'Port for MCP server')
    .action(async (sessionId: string, options: StartOptions) => {
      const result = await startSwarmSession(sessionId, options);
      if (isErr(result)) {
        console.error('Failed to start swarm:', result.error.message);
        process.exit(1);
      }
      console.log('Swarm completed successfully!');
    });

  return command;
}

// Start a swarm session
async function startSwarmSession(
  sessionId: string, 
  options: StartOptions
): Promise<Result<void, Error>> {
  try {
    // Load existing state
    const loadResult = await loadState(sessionId);
    if (isErr(loadResult)) {
      return loadResult;
    }

    const state = loadResult.value;
    console.log('Starting swarm session:', sessionId);
    console.log('Current phase:', state.phase);
    console.log('Context:', state.context);

    // Run the swarm conductor
    const runResult = await runSwarm(state, {
      debug: options.debug || false,
      mcpPort: options.mcpPort
    });

    return runResult;
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}