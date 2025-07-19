/**
 * Confidence tracking and checkpoint types
 * Used for decision-making and progress tracking
 */

import type { Phase } from './core';
import type { Result } from './result';

/**
 * Factors that contribute to confidence calculation
 */
export interface ConfidenceFactors {
  readonly successRate: number; // 0-1, historical success rate
  readonly consensusLevel: number; // 0-1, agreement among nodes
  readonly resourceUtilization: number; // 0-1, how well resources are used
  readonly progressRate: number; // 0-1, speed of progress
  readonly errorRate: number; // 0-1, inverse of error frequency
  readonly complexity: number; // 0-1, inverse of task complexity
  readonly experience: number; // 0-1, familiarity with similar tasks
}

/**
 * Confidence calculation result
 */
export interface ConfidenceScore {
  readonly value: number; // 0-1, overall confidence
  readonly factors: Readonly<ConfidenceFactors>;
  readonly timestamp: number;
  readonly metadata: Readonly<{
    readonly calculation: string;
    readonly weights: Readonly<Record<keyof ConfidenceFactors, number>>;
  }>;
}

/**
 * Checkpoint for saving and restoring state
 */
export interface Checkpoint {
  readonly id: string;
  readonly sprintId: string;
  readonly phase: Phase;
  readonly timestamp: number;
  readonly confidence: ConfidenceScore;
  readonly state: unknown; // Serialized sprint state
  readonly metadata: Readonly<{
    readonly reason: string;
    readonly automatic: boolean;
    readonly size: number; // bytes
    readonly hash: string;
  }>;
}

/**
 * Checkpoint validation result
 */
export interface CheckpointValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly repairableIssues: readonly {
    readonly issue: string;
    readonly fix: () => Result<void, Error>;
  }[];
}

/**
 * Default confidence weights
 */
export const DEFAULT_CONFIDENCE_WEIGHTS: Readonly<Record<keyof ConfidenceFactors, number>> = {
  successRate: 0.25,
  consensusLevel: 0.20,
  resourceUtilization: 0.10,
  progressRate: 0.15,
  errorRate: 0.15,
  complexity: 0.10,
  experience: 0.05
} as const;

/**
 * Calculate confidence score from factors
 */
export const calculateConfidence = (
  factors: ConfidenceFactors,
  weights: Readonly<Record<keyof ConfidenceFactors, number>> = DEFAULT_CONFIDENCE_WEIGHTS
): ConfidenceScore => {
  // Normalize weights to sum to 1
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const normalizedWeights = Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / totalWeight])
  ) as Record<keyof ConfidenceFactors, number>;

  // Calculate weighted average
  const value = Object.entries(factors).reduce((sum, [key, value]) => {
    const weight = normalizedWeights[key as keyof ConfidenceFactors];
    return sum + (value * weight);
  }, 0);

  return {
    value: Math.max(0, Math.min(1, value)), // Clamp to 0-1
    factors: { ...factors },
    timestamp: Date.now(),
    metadata: {
      calculation: 'weighted_average',
      weights: { ...normalizedWeights }
    }
  };
};

/**
 * Confidence thresholds for decision making
 */
export const CONFIDENCE_THRESHOLDS = {
  CRITICAL: 0.95,
  HIGH: 0.80,
  MEDIUM: 0.60,
  LOW: 0.40,
  MINIMAL: 0.20
} as const;

export type ConfidenceLevel = keyof typeof CONFIDENCE_THRESHOLDS;

/**
 * Get confidence level from score
 */
export const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= CONFIDENCE_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (score >= CONFIDENCE_THRESHOLDS.LOW) return 'LOW';
  return 'MINIMAL';
};

/**
 * Check if confidence meets threshold
 */
export const meetsThreshold = (
  score: ConfidenceScore,
  threshold: number | ConfidenceLevel
): boolean => {
  const thresholdValue = typeof threshold === 'number' 
    ? threshold 
    : CONFIDENCE_THRESHOLDS[threshold];
  
  return score.value >= thresholdValue;
};

/**
 * Checkpoint creation options
 */
export interface CheckpointOptions {
  readonly reason: string;
  readonly automatic?: boolean;
  readonly includeHistory?: boolean;
  readonly compression?: boolean;
}

/**
 * Checkpoint restoration options
 */
export interface RestoreOptions {
  readonly validateIntegrity?: boolean;
  readonly restorePartial?: boolean;
  readonly skipValidation?: boolean;
}

/**
 * Type guard for ConfidenceScore
 */
export const isConfidenceScore = (value: unknown): value is ConfidenceScore => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    'factors' in value &&
    'timestamp' in value &&
    typeof (value as any).value === 'number'
  );
};

/**
 * Type guard for Checkpoint
 */
export const isCheckpoint = (value: unknown): value is Checkpoint => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'sprintId' in value &&
    'phase' in value &&
    'timestamp' in value &&
    'confidence' in value &&
    'state' in value
  );
};