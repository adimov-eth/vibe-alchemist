/**
 * Configuration types for Swarm Conductor
 * All configurations are immutable and validated
 */

import type { Phase } from './core';

/**
 * Resource limits configuration
 */
export interface ResourceLimits {
  readonly maxTokens: number;
  readonly maxTime: number; // milliseconds
  readonly maxMemory: number; // MB
  readonly maxNodes: number;
  readonly maxRetries: number;
  readonly maxConcurrency: number;
}

/**
 * Recursion control configuration
 */
export interface RecursionConfig {
  readonly maxDepth: number;
  readonly maxBranches: number;
  readonly backtrackingEnabled: boolean;
  readonly memoizationEnabled: boolean;
  readonly pruningThreshold: number; // confidence threshold for pruning branches
}

/**
 * Phase-specific configuration
 */
export interface PhaseConfig {
  readonly phase: Phase;
  readonly timeLimit: number;
  readonly tokenLimit: number;
  readonly requiredConfidence: number;
  readonly retryLimit: number;
  readonly parallelizable: boolean;
}

/**
 * Monitoring and telemetry configuration
 */
export interface MonitoringConfig {
  readonly enabled: boolean;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly metricsInterval: number; // milliseconds
  readonly persistMetrics: boolean;
  readonly tracingEnabled: boolean;
}

/**
 * Swarm behavior configuration
 */
export interface SwarmConfig {
  readonly coordinationStrategy: 'centralized' | 'distributed' | 'hybrid';
  readonly consensusThreshold: number; // 0-1, percentage of nodes that must agree
  readonly communicationProtocol: 'broadcast' | 'mesh' | 'hierarchical';
  readonly loadBalancingEnabled: boolean;
  readonly adaptiveScaling: boolean;
}

/**
 * Main configuration interface
 */
export interface Config {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly resourceLimits: Readonly<ResourceLimits>;
  readonly recursionConfig: Readonly<RecursionConfig>;
  readonly phaseConfigs: ReadonlyArray<PhaseConfig>;
  readonly monitoringConfig: Readonly<MonitoringConfig>;
  readonly swarmConfig: Readonly<SwarmConfig>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Default resource limits
 */
export const DEFAULT_RESOURCE_LIMITS: Readonly<ResourceLimits> = {
  maxTokens: 100000,
  maxTime: 300000, // 5 minutes
  maxMemory: 512, // MB
  maxNodes: 10,
  maxRetries: 3,
  maxConcurrency: 5
} as const;

/**
 * Default recursion configuration
 */
export const DEFAULT_RECURSION_CONFIG: Readonly<RecursionConfig> = {
  maxDepth: 5,
  maxBranches: 3,
  backtrackingEnabled: true,
  memoizationEnabled: true,
  pruningThreshold: 0.3
} as const;

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: Readonly<MonitoringConfig> = {
  enabled: true,
  logLevel: 'info',
  metricsInterval: 5000,
  persistMetrics: true,
  tracingEnabled: false
} as const;

/**
 * Default swarm configuration
 */
export const DEFAULT_SWARM_CONFIG: Readonly<SwarmConfig> = {
  coordinationStrategy: 'hybrid',
  consensusThreshold: 0.7,
  communicationProtocol: 'mesh',
  loadBalancingEnabled: true,
  adaptiveScaling: true
} as const;

/**
 * Configuration validation
 */
export const isValidConfig = (config: unknown): config is Config => {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as Record<string, unknown>;
  
  return (
    typeof c['id'] === 'string' &&
    typeof c['name'] === 'string' &&
    typeof c['version'] === 'string' &&
    c['resourceLimits'] !== undefined &&
    c['recursionConfig'] !== undefined &&
    Array.isArray(c['phaseConfigs']) &&
    c['monitoringConfig'] !== undefined &&
    c['swarmConfig'] !== undefined
  );
};

/**
 * Merge configurations with immutability
 */
export const mergeConfigs = (base: Config, overrides: Partial<Config>): Config => {
  return {
    ...base,
    ...overrides,
    resourceLimits: {
      ...base.resourceLimits,
      ...(overrides.resourceLimits || {})
    },
    recursionConfig: {
      ...base.recursionConfig,
      ...(overrides.recursionConfig || {})
    },
    monitoringConfig: {
      ...base.monitoringConfig,
      ...(overrides.monitoringConfig || {})
    },
    swarmConfig: {
      ...base.swarmConfig,
      ...(overrides.swarmConfig || {})
    },
    metadata: {
      ...base.metadata,
      ...(overrides.metadata || {})
    }
  };
};