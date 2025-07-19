import { spawn } from "bun";
import { Result, ok, err } from "../types";

export interface ClaudeFlowOptions {
  swarmId?: string;
  agents?: number;
  timeout?: number;
  env?: Record<string, string>;
}

export interface SwarmResult {
  success: boolean;
  output: string;
  exitCode: number;
  duration: number;
}

export class ClaudeFlowIntegration {
  private defaultTimeout = 300000; // 5 minutes

  async runSwarm(
    task: string,
    options: ClaudeFlowOptions = {}
  ): Promise<Result<SwarmResult, Error>> {
    const startTime = Date.now();
    
    try {
      const args = ["claude-flow@alpha"];
      
      // Add optional arguments
      if (options.swarmId) args.push("--swarm-id", options.swarmId);
      if (options.agents) args.push("--agents", options.agents.toString());
      
      // Add the task
      args.push(task);

      const proc = spawn({
        cmd: ["npx", ...args],
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, ...options.env }
      });

      // Set up timeout
      const timeout = options.timeout || this.defaultTimeout;
      const timeoutId = setTimeout(() => {
        proc.kill();
      }, timeout);

      // Collect output
      const output: string[] = [];
      const errors: string[] = [];

      const decoder = new TextDecoder();
      
      if (proc.stdout) {
        for await (const chunk of proc.stdout) {
          output.push(decoder.decode(chunk));
        }
      }

      if (proc.stderr) {
        for await (const chunk of proc.stderr) {
          errors.push(decoder.decode(chunk));
        }
      }

      const exitCode = await proc.exited;
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const fullOutput = output.join('') + (errors.length > 0 ? '\n' + errors.join('') : '');

      return ok({
        success: exitCode === 0,
        output: fullOutput,
        exitCode,
        duration
      });
    } catch (error) {
      return err(new Error(`Failed to run swarm: ${error}`));
    }
  }

  async runHook(
    hookName: string,
    args: Record<string, string> = {}
  ): Promise<Result<string, Error>> {
    try {
      const cmdArgs = ["claude-flow@alpha", "hooks", hookName];
      
      // Add hook arguments
      for (const [key, value] of Object.entries(args)) {
        cmdArgs.push(`--${key}`, value);
      }

      const proc = spawn({
        cmd: ["npx", ...cmdArgs],
        stdout: "pipe",
        stderr: "pipe"
      });

      const output: string[] = [];
      const decoder = new TextDecoder();
      
      if (proc.stdout) {
        for await (const chunk of proc.stdout) {
          output.push(decoder.decode(chunk));
        }
      }

      const exitCode = await proc.exited;
      
      if (exitCode !== 0) {
        return err(new Error(`Hook ${hookName} failed with exit code ${exitCode}`));
      }

      return ok(output.join(''));
    } catch (error) {
      return err(new Error(`Failed to run hook: ${error}`));
    }
  }

  async checkAvailability(): Promise<Result<boolean, Error>> {
    try {
      const proc = spawn({
        cmd: ["npx", "claude-flow@alpha", "--version"],
        stdout: "pipe",
        stderr: "pipe"
      });

      const exitCode = await proc.exited;
      return ok(exitCode === 0);
    } catch (error) {
      return ok(false);
    }
  }
}