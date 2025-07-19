/**
 * Test Helpers
 * Utilities for testing Swarm Conductor
 */

import { mock, spyOn } from 'bun:test';
import type { StateRepository } from '../src/state/repository';
import type { ConfidenceScore, ConfidenceCalculator } from '../src/core/confidence';
import type { Agent } from '../src/core/types';

/**
 * Create a mock StateRepository
 */
export function createMockStateRepository(): StateRepository {
  return {
    saveState: mock(() => Promise.resolve()),
    loadState: mock(() => Promise.resolve(null)),
    deleteState: mock(() => Promise.resolve()),
    listStates: mock(() => Promise.resolve([])),
    getStatePath: mock(() => '/mock/path'),
    ensureDirectory: mock(() => Promise.resolve()),
  };
}

/**
 * Create a mock ConfidenceCalculator
 */
export function createMockConfidenceCalculator(): ConfidenceCalculator {
  return {
    calculate: mock(() => ({ overall: 0.8, components: {} } as ConfidenceScore)),
    calculateWithHistory: mock(() => ({ overall: 0.85, components: {} } as ConfidenceScore)),
    combineScores: mock(() => 0.82),
    normalizeScore: mock(() => 0.8),
  };
}

/**
 * Create a mock Agent
 */
export function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'mock-agent-1',
    name: 'Mock Agent',
    type: 'executor',
    status: 'idle',
    capabilities: ['test'],
    metrics: {
      tasksCompleted: 0,
      successRate: 1.0,
      averageResponseTime: 100,
    },
    ...overrides,
  };
}

/**
 * Create test file structure in memory
 */
export function createTestFileStructure(): Map<string, string> {
  const files = new Map<string, string>();
  
  files.set('/test/src/index.ts', `
export function main() {
  console.log('Hello, Swarm!');
}
`);

  files.set('/test/src/core/types.ts', `
export interface Agent {
  id: string;
  name: string;
}
`);

  files.set('/test/tests/index.test.ts', `
import { expect, test } from 'bun:test';
import { main } from '../src/index';

test('main function', () => {
  expect(main).toBeDefined();
});
`);

  return files;
}

/**
 * Mock file system operations
 */
export function mockFileSystem() {
  const files = createTestFileStructure();
  
  return {
    readFile: mock((path: string) => {
      const content = files.get(path);
      if (!content) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return Promise.resolve(content);
    }),
    writeFile: mock((path: string, content: string) => {
      files.set(path, content);
      return Promise.resolve();
    }),
    exists: mock((path: string) => {
      return Promise.resolve(files.has(path));
    }),
    mkdir: mock(() => Promise.resolve()),
    readdir: mock((path: string) => {
      const entries = Array.from(files.keys())
        .filter(p => p.startsWith(path))
        .map(p => p.slice(path.length + 1).split('/')[0])
        .filter((v, i, a) => a.indexOf(v) === i);
      return Promise.resolve(entries);
    }),
  };
}

/**
 * Create a test timeout helper
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = 'Operation timed out',
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {},
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`${message} after ${timeout}ms`);
}

/**
 * Snapshot testing helper
 */
export class SnapshotTester {
  private snapshots: Map<string, any> = new Map();

  toMatchSnapshot(name: string, value: any): void {
    const existing = this.snapshots.get(name);
    if (existing) {
      expect(value).toEqual(existing);
    } else {
      this.snapshots.set(name, value);
    }
  }

  getSnapshot(name: string): any {
    return this.snapshots.get(name);
  }

  clearSnapshots(): void {
    this.snapshots.clear();
  }
}

/**
 * Performance testing helper
 */
export class PerformanceTester {
  private measurements: Map<string, number[]> = new Map();

  async measure<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      const measurements = this.measurements.get(name) || [];
      measurements.push(duration);
      this.measurements.set(name, measurements);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      const measurements = this.measurements.get(name) || [];
      measurements.push(duration);
      this.measurements.set(name, measurements);
      throw error;
    }
  }

  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }

  clear(): void {
    this.measurements.clear();
  }
}

/**
 * Create test environment
 */
export function createTestEnv() {
  return {
    fs: mockFileSystem(),
    stateRepo: createMockStateRepository(),
    confidenceCalc: createMockConfidenceCalculator(),
    snapshots: new SnapshotTester(),
    performance: new PerformanceTester(),
  };
}