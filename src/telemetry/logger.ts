/**
 * Telemetry and logging for Swarm Conductor
 * Using winston for structured logging with confidence scores and outcomes
 */

import winston from 'winston';
import { Result, isOk } from '../types';

interface TelemetryEvent {
  timestamp: Date;
  sessionId: string;
  sprintId?: string;
  phase: string;
  confidence: number;
  outcome: 'success' | 'failure' | 'timeout';
  metrics?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

interface LogConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  enableTelemetry: boolean;
  enableFileLogging: boolean;
  logDir: string;
}

const DEFAULT_CONFIG: LogConfig = {
  level: 'info',
  enableTelemetry: true,
  enableFileLogging: true,
  logDir: '.swarm-conductor/logs'
} as const;

/**
 * Create structured logger with telemetry support
 */
export function createLogger(config: Partial<LogConfig> = {}): winston.Logger {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      )
    })
  ];

  if (finalConfig.enableFileLogging) {
    transports.push(
      new winston.transports.File({
        filename: `${finalConfig.logDir}/swarm-conductor.log`,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),
      new winston.transports.File({
        filename: `${finalConfig.logDir}/telemetry.log`,
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );
  }

  return winston.createLogger({
    level: finalConfig.level,
    transports,
    defaultMeta: { service: 'swarm-conductor' }
  });
}

/**
 * Log telemetry event with confidence scoring
 */
export function logTelemetryEvent(
  logger: winston.Logger,
  event: TelemetryEvent
): Result<void, Error> {
  try {
    logger.info('Telemetry Event', {
      type: 'telemetry',
      ...event,
      timestamp: event.timestamp.toISOString()
    });
    
    // Log confidence analysis for learning
    if (event.confidence < 0.6) {
      logger.warn('Low confidence sprint detected', {
        sessionId: event.sessionId,
        sprintId: event.sprintId,
        confidence: event.confidence,
        phase: event.phase
      });
    }
    
    return { kind: 'ok', value: undefined };
  } catch (error) {
    return { 
      kind: 'err', 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Log sprint completion with outcome analysis
 */
export function logSprintCompletion(
  logger: winston.Logger,
  sessionId: string,
  sprintId: string,
  result: Result<unknown, Error>,
  confidence: number,
  metrics: Record<string, number> = {}
): Result<void, Error> {
  const outcome = isOk(result) ? 'success' : 'failure';
  
  return logTelemetryEvent(logger, {
    timestamp: new Date(),
    sessionId,
    sprintId,
    phase: 'completion',
    confidence,
    outcome,
    metrics,
    metadata: {
      error: isOk(result) ? undefined : result.error.message
    }
  });
}

/**
 * Log confidence threshold events for analysis
 */
export function logConfidenceThreshold(
  logger: winston.Logger,
  sessionId: string,
  threshold: number,
  actual: number,
  action: 'proceed' | 'gate' | 'abort'
): Result<void, Error> {
  return logTelemetryEvent(logger, {
    timestamp: new Date(),
    sessionId,
    phase: 'confidence_check',
    confidence: actual,
    outcome: action === 'proceed' ? 'success' : 'failure',
    metadata: {
      threshold,
      action,
      delta: actual - threshold
    }
  });
}

/**
 * Extract metrics for post-analysis
 */
export function extractSessionMetrics(
  logger: winston.Logger,
  sessionId: string
): Result<Record<string, number>, Error> {
  try {
    // In a real implementation, this would query log files
    // For now, return basic metrics structure
    const metrics = {
      totalSprints: 0,
      averageConfidence: 0,
      successRate: 0,
      totalDuration: 0
    };
    
    logger.info('Session metrics extracted', { sessionId, metrics });
    
    return { kind: 'ok', value: metrics };
  } catch (error) {
    return { 
      kind: 'err', 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

// Default logger instance
export const defaultLogger = createLogger();