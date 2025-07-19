/**
 * Test setup file
 * Runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SWARM_TEST_MODE = 'true';

// Disable console output during tests unless DEBUG is set
if (!process.env.DEBUG) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
}

// Global test utilities
global.testTimeout = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Test timeout')), ms);
  });
};

// Mock performance.now if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
  } as any;
}

// Ensure test directories exist
import { mkdirSync } from 'fs';
import { join } from 'path';

const testDirs = [
  '.test-cache',
  '.test-state',
  '.test-output'
];

for (const dir of testDirs) {
  try {
    mkdirSync(join(process.cwd(), dir), { recursive: true });
  } catch {
    // Ignore if already exists
  }
}

// Clean up on exit
process.on('exit', () => {
  // Cleanup is handled in individual tests
});