#!/usr/bin/env bun
import { Command } from 'commander';
import { Result, ok, err, isErr } from '../types';
import { initCommand } from './commands/init';
import { startCommand } from './commands/start';
import { resumeCommand } from './commands/resume';
import { mcpServerCommand } from './commands/mcp-server';

// Pure function to create the CLI program
export function createProgram(): Command {
  const program = new Command();

  program
    .name('swarm-conductor')
    .description('Orchestrate multi-agent AI swarms with SPARC methodology')
    .version('0.1.0');

  // Add commands
  program.addCommand(initCommand());
  program.addCommand(startCommand());
  program.addCommand(resumeCommand());
  program.addCommand(mcpServerCommand());

  return program;
}

// Parse CLI arguments and handle errors
export async function runCLI(args: string[]): Promise<Result<void, Error>> {
  try {
    const program = createProgram();
    await program.parseAsync(args);
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Entry point when run directly
if (import.meta.main) {
  runCLI(process.argv).then(result => {
    if (isErr(result)) {
      console.error('Error:', result.error.message);
      process.exit(1);
    }
  });
}