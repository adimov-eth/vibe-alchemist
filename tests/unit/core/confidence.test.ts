/**
 * Unit tests for confidence calculation
 */

import { expect, test, describe, beforeEach } from 'bun:test';
import {
  calculateConfidence,
  getConfidenceLevel,
  meetsThreshold,
  isConfidenceScore,
  DEFAULT_CONFIDENCE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  type ConfidenceFactors,
  type ConfidenceScore,
} from '../../../src/types/confidence';

describe('Confidence Calculation', () => {
  let testFactors: ConfidenceFactors;

  beforeEach(() => {
    testFactors = {
      successRate: 0.8,
      consensusLevel: 0.9,
      resourceUtilization: 0.7,
      progressRate: 0.75,
      errorRate: 0.85,
      complexity: 0.6,
      experience: 0.5,
    };
  });

  describe('calculateConfidence', () => {
    test('calculates weighted average correctly', () => {
      const score = calculateConfidence(testFactors);
      
      expect(score.value).toBeGreaterThan(0);
      expect(score.value).toBeLessThanOrEqual(1);
      expect(score.factors).toEqual(testFactors);
      expect(score.timestamp).toBeCloseTo(Date.now(), -2);
      expect(score.metadata.calculation).toBe('weighted_average');
    });

    test('uses default weights when not provided', () => {
      const score = calculateConfidence(testFactors);
      expect(score.metadata.weights).toEqual(DEFAULT_CONFIDENCE_WEIGHTS);
    });

    test('normalizes custom weights', () => {
      const customWeights = {
        successRate: 1,
        consensusLevel: 1,
        resourceUtilization: 1,
        progressRate: 1,
        errorRate: 1,
        complexity: 1,
        experience: 1,
      };
      
      const score = calculateConfidence(testFactors, customWeights);
      const weightSum = Object.values(score.metadata.weights).reduce((sum, w) => sum + w, 0);
      expect(weightSum).toBeCloseTo(1, 5);
    });

    test('clamps result to 0-1 range', () => {
      const extremeFactors: ConfidenceFactors = {
        successRate: 2.0,  // Invalid high
        consensusLevel: -0.5,  // Invalid low
        resourceUtilization: 1.5,
        progressRate: 1.0,
        errorRate: 1.0,
        complexity: 1.0,
        experience: 1.0,
      };
      
      const score = calculateConfidence(extremeFactors);
      expect(score.value).toBeGreaterThanOrEqual(0);
      expect(score.value).toBeLessThanOrEqual(1);
    });

    test('handles zero weights correctly', () => {
      const zeroWeights = {
        successRate: 0,
        consensusLevel: 1,
        resourceUtilization: 0,
        progressRate: 0,
        errorRate: 0,
        complexity: 0,
        experience: 0,
      };
      
      const score = calculateConfidence(testFactors, zeroWeights);
      expect(score.value).toBe(testFactors.consensusLevel);
    });

    test('produces consistent results', () => {
      const score1 = calculateConfidence(testFactors);
      const score2 = calculateConfidence(testFactors);
      
      expect(score1.value).toBe(score2.value);
      expect(score1.factors).toEqual(score2.factors);
      expect(score1.metadata.weights).toEqual(score2.metadata.weights);
    });
  });

  describe('getConfidenceLevel', () => {
    test('returns correct level for each threshold', () => {
      expect(getConfidenceLevel(0.96)).toBe('CRITICAL');
      expect(getConfidenceLevel(0.95)).toBe('CRITICAL');
      expect(getConfidenceLevel(0.85)).toBe('HIGH');
      expect(getConfidenceLevel(0.80)).toBe('HIGH');
      expect(getConfidenceLevel(0.65)).toBe('MEDIUM');
      expect(getConfidenceLevel(0.60)).toBe('MEDIUM');
      expect(getConfidenceLevel(0.45)).toBe('LOW');
      expect(getConfidenceLevel(0.40)).toBe('LOW');
      expect(getConfidenceLevel(0.25)).toBe('MINIMAL');
      expect(getConfidenceLevel(0.19)).toBe('MINIMAL');
    });

    test('handles edge cases', () => {
      expect(getConfidenceLevel(1.0)).toBe('CRITICAL');
      expect(getConfidenceLevel(0.0)).toBe('MINIMAL');
      expect(getConfidenceLevel(-0.1)).toBe('MINIMAL');
      expect(getConfidenceLevel(1.1)).toBe('CRITICAL');
    });
  });

  describe('meetsThreshold', () => {
    let score: ConfidenceScore;

    beforeEach(() => {
      score = calculateConfidence(testFactors);
    });

    test('works with numeric thresholds', () => {
      const highScore = { ...score, value: 0.85 };
      const lowScore = { ...score, value: 0.35 };
      
      expect(meetsThreshold(highScore, 0.8)).toBe(true);
      expect(meetsThreshold(highScore, 0.9)).toBe(false);
      expect(meetsThreshold(lowScore, 0.3)).toBe(true);
      expect(meetsThreshold(lowScore, 0.4)).toBe(false);
    });

    test('works with named thresholds', () => {
      const highScore = { ...score, value: 0.85 };
      
      expect(meetsThreshold(highScore, 'HIGH')).toBe(true);
      expect(meetsThreshold(highScore, 'CRITICAL')).toBe(false);
      expect(meetsThreshold(highScore, 'MEDIUM')).toBe(true);
      expect(meetsThreshold(highScore, 'LOW')).toBe(true);
      expect(meetsThreshold(highScore, 'MINIMAL')).toBe(true);
    });

    test('handles edge cases with exact threshold values', () => {
      const exactScore = { ...score, value: CONFIDENCE_THRESHOLDS.HIGH };
      expect(meetsThreshold(exactScore, 'HIGH')).toBe(true);
      expect(meetsThreshold(exactScore, CONFIDENCE_THRESHOLDS.HIGH)).toBe(true);
    });
  });

  describe('Type Guards', () => {
    describe('isConfidenceScore', () => {
      test('validates correct ConfidenceScore objects', () => {
        const score = calculateConfidence(testFactors);
        expect(isConfidenceScore(score)).toBe(true);
      });

      test('rejects invalid objects', () => {
        expect(isConfidenceScore(null)).toBe(false);
        expect(isConfidenceScore(undefined)).toBe(false);
        expect(isConfidenceScore({})).toBe(false);
        expect(isConfidenceScore({ value: 0.5 })).toBe(false);
        expect(isConfidenceScore({ 
          value: 'not a number', 
          factors: {}, 
          timestamp: Date.now() 
        })).toBe(false);
      });

      test('validates minimal valid structure', () => {
        const minimal = {
          value: 0.5,
          factors: {},
          timestamp: Date.now(),
        };
        expect(isConfidenceScore(minimal)).toBe(true);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles all zero factors', () => {
      const zeroFactors: ConfidenceFactors = {
        successRate: 0,
        consensusLevel: 0,
        resourceUtilization: 0,
        progressRate: 0,
        errorRate: 0,
        complexity: 0,
        experience: 0,
      };
      
      const score = calculateConfidence(zeroFactors);
      expect(score.value).toBe(0);
    });

    test('handles all max factors', () => {
      const maxFactors: ConfidenceFactors = {
        successRate: 1,
        consensusLevel: 1,
        resourceUtilization: 1,
        progressRate: 1,
        errorRate: 1,
        complexity: 1,
        experience: 1,
      };
      
      const score = calculateConfidence(maxFactors);
      expect(score.value).toBe(1);
    });

    test('handles negative weights gracefully', () => {
      const negativeWeights = {
        successRate: -1,
        consensusLevel: 1,
        resourceUtilization: 1,
        progressRate: 1,
        errorRate: 1,
        complexity: 1,
        experience: 1,
      };
      
      // Should still normalize and produce valid result
      const score = calculateConfidence(testFactors, negativeWeights);
      expect(score.value).toBeGreaterThanOrEqual(0);
      expect(score.value).toBeLessThanOrEqual(1);
    });
  });
});