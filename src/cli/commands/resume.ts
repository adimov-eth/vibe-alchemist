import { Command } from 'commander';
import { Result, err } from '../../types/result';
import { SwarmState } from '../../types/cli';
import { loadState } from '../../core/persistence';
import { runSwarm } from '../../core/conductor';

interface ResumeOptions {
  debug?: boolean;
  mcpPort?: number;
}

// Pure function to create resume command
export function resumeCommand(): Command {
  const command = new Command('resume');

  command
    .description('Resume a paused swarm conductor session')
    .argument('<session-id>', 'Session ID to resume')
    .option('-d, --debug', 'Enable debug mode')
    .option('-p, --mcp-port <number>', 'Port for MCP server')
    .action(async (sessionId: string, options: ResumeOptions) => {
      const result = await resumeSwarmSession(sessionId, options);
      if (result.kind === 'err') {
        console.error('Failed to resume swarm:', result.error.message);
        process.exit(1);
      }
      console.log('Swarm resumed and completed successfully!');
    });

  return command;
}

// Resume a paused swarm session
async function resumeSwarmSession(
  sessionId: string,
  options: ResumeOptions
): Promise<Result<void, Error>> {
  try {
    // Load existing state
    const loadResult = await loadState(sessionId);
    if (loadResult.kind === 'err') {
      return loadResult;
    }

    const state = loadResult.value;
    
    // Check if session can be resumed
    if (state.phase === 'completing') {
      return err(new Error('Session is already completed'));
    }

    console.log('Resuming swarm session:', sessionId);
    console.log('Current phase:', state.phase);
    console.log('Confidence level:', state.confidence);
    console.log('Active tasks:', state.tasks.filter((t: any) => t.status === 'in-progress').length);

    // Resume the swarm conductor
    const runResult = await runSwarm(state, {
      debug: options.debug || false,
      mcpPort: options.mcpPort,
      isResume: true
    });

    return runResult;
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}