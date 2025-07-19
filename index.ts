#!/usr/bin/env bun
// Entry point for swarm-conductor
import { runCLI } from './src/cli';

// Run the CLI
runCLI(process.argv).then(result => {
  if (result.kind === 'err') {
    console.error('Error:', result.error.message);
    process.exit(1);
  }
});