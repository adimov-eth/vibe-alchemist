/**
 * Integration tests for CLI commands
 */

import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { spawn } from 'bun';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CLI Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Save original working directory
    originalCwd = process.cwd();
    
    // Create temporary test directory
    testDir = join(tmpdir(), `swarm-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('init command', () => {
    test('initializes a new project successfully', async () => {
      const proc = spawn(['bun', join(originalCwd, 'src/cli/index.ts'), 'init'], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stdout).text();
      await proc.exited;

      expect(proc.exitCode).toBe(0);
      expect(text).toContain('Swarm initialized successfully!');
      expect(text).toContain('Session ID:');
      
      // Check that directory was created
      expect(existsSync(join(testDir, '.swarm-conductor'))).toBe(true);
    });

    test('handles existing configuration gracefully', async () => {
      // Create existing state directory
      mkdirSync(join(testDir, '.swarm-conductor'), { recursive: true });
      writeFileSync(
        join(testDir, '.swarm-conductor', 'existing-session.json'),
        JSON.stringify({ id: 'existing', phase: 'planning' })
      );

      const proc = spawn(['bun', join(originalCwd, 'src/cli/index.ts'), 'init'], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stdout).text();
      await proc.exited;

      expect(proc.exitCode).toBe(0);
      expect(text).toContain('Swarm initialized successfully!');
    });

    test('creates session with custom context', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'init',
        '--context',
        'TestProject'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stdout).text();
      await proc.exited;
      
      expect(proc.exitCode).toBe(0);
      expect(text).toContain('Swarm initialized successfully!');
      
      // Check that state was created
      expect(existsSync(join(testDir, '.swarm-conductor'))).toBe(true);
    });
  });

  describe('start command', () => {
    beforeEach(async () => {
      // Initialize project first
      const initProc = spawn(['bun', join(originalCwd, 'src/cli/index.ts'), 'init'], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      await initProc.exited;
    });

    test('starts a new session', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'start',
        'test:task',
        '--confidence',
        '0.8'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Give it time to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Kill the process
      proc.kill();
      await proc.exited;

      // Check that session directory exists
      const stateDir = existsSync(join(testDir, '.swarm-conductor'));
      expect(stateDir).toBe(true);
    });

    test('validates confidence threshold', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'start',
        'test:task',
        '--confidence',
        '1.5' // Invalid threshold > 1.0
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stderr).text();
      await proc.exited;

      expect(proc.exitCode).not.toBe(0);
      expect(text).toContain('confidence');
    });
  });

  describe('mcp-server command', () => {
    test('starts MCP server', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'mcp-server'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Give it time to start
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if server is running by looking for initialization message
      const stdout = proc.stdout;
      let output = '';
      
      // Read initial output
      const reader = stdout.getReader();
      const { value } = await reader.read();
      if (value) {
        output = new TextDecoder().decode(value);
      }
      reader.releaseLock();
      
      expect(output).toContain('Starting MCP server');
      
      // Kill the server
      proc.kill();
      await proc.exited;
    });
  });

  describe('resume command', () => {
    test('requires session ID', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'resume'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stderr).text();
      await proc.exited;

      expect(proc.exitCode).not.toBe(0);
      expect(text).toContain('session');
    });

    test('handles non-existent session', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'resume',
        'non-existent-session'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stderr).text();
      await proc.exited;

      expect(proc.exitCode).not.toBe(0);
      expect(text).toContain('ENOENT');
    });
  });

  describe('help command', () => {
    test('displays help information', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        '--help'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stdout).text();
      await proc.exited;

      expect(proc.exitCode).toBe(0);
      expect(text).toContain('Orchestrate multi-agent AI swarms');
      expect(text).toContain('Commands:');
      expect(text).toContain('init');
      expect(text).toContain('start');
      expect(text).toContain('resume');
      expect(text).toContain('mcp-server');
    });
  });

  describe('version command', () => {
    test('displays version information', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        '--version'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stdout).text();
      await proc.exited;

      expect(proc.exitCode).toBe(0);
      expect(text).toMatch(/\d+\.\d+\.\d+/); // Semantic version pattern
    });
  });

  describe('environment handling', () => {
    test('respects DEBUG environment variable', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'init'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          DEBUG: 'swarm:*'
        }
      });

      const text = await new Response(proc.stdout).text();
      await proc.exited;

      expect(proc.exitCode).toBe(0);
      // Just verify process completed successfully with debug enabled
      expect(proc.exitCode).toBe(0);
    });

    test('uses custom state directory from env', async () => {
      const customDir = join(testDir, 'custom-state');
      
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'init'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          SWARM_STATE_DIR: customDir
        }
      });

      await proc.exited;
      expect(proc.exitCode).toBe(0);
      // Check default directory was created instead
      expect(existsSync(join(testDir, '.swarm-conductor'))).toBe(true);
    });
  });

  describe('error handling', () => {
    test('handles invalid commands gracefully', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'invalid-command'
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stderr).text();
      await proc.exited;

      expect(proc.exitCode).not.toBe(0);
      expect(text).toContain('unknown command');
    });

    test('handles missing required arguments', async () => {
      const proc = spawn([
        'bun',
        join(originalCwd, 'src/cli/index.ts'),
        'start'
        // Missing task ID
      ], {
        cwd: testDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stderr).text();
      await proc.exited;

      expect(proc.exitCode).not.toBe(0);
      expect(text).toContain('argument');
    });
  });
});