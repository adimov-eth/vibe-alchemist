/**
 * Timeout Management
 * Handles timeout configuration and cancellation for browser operations
 */

export interface TimeoutConfig {
  default: number;
  navigation: number;
  selector: number;
  script: number;
  resource: number;
}

export interface TimeoutHandle {
  id: string;
  timeout: NodeJS.Timeout;
  startTime: number;
  duration: number;
  operation: string;
  cancelled: boolean;
}

/**
 * Default timeout configurations
 */
export const DEFAULT_TIMEOUTS: TimeoutConfig = {
  default: 30000,      // 30 seconds
  navigation: 45000,   // 45 seconds for page loads
  selector: 10000,     // 10 seconds for element waits
  script: 5000,        // 5 seconds for script execution
  resource: 60000,     // 60 seconds for resource downloads
};

/**
 * Timeout manager for coordinating timeouts across operations
 */
export class TimeoutManager {
  private timeouts: Map<string, TimeoutHandle> = new Map();
  private config: TimeoutConfig;
  private idCounter = 0;

  constructor(config: Partial<TimeoutConfig> = {}) {
    this.config = { ...DEFAULT_TIMEOUTS, ...config };
  }

  /**
   * Create a timeout with cancellation support
   */
  createTimeout(
    operation: string,
    duration?: number,
    onTimeout?: () => void,
  ): TimeoutHandle {
    const id = `timeout-${++this.idCounter}`;
    const timeoutDuration = duration || this.config.default;

    const timeout = setTimeout(() => {
      const handle = this.timeouts.get(id);
      if (handle && !handle.cancelled) {
        this.timeouts.delete(id);
        if (onTimeout) {
          onTimeout();
        }
      }
    }, timeoutDuration);

    const handle: TimeoutHandle = {
      id,
      timeout,
      startTime: Date.now(),
      duration: timeoutDuration,
      operation,
      cancelled: false,
    };

    this.timeouts.set(id, handle);
    return handle;
  }

  /**
   * Cancel a specific timeout
   */
  cancelTimeout(handleOrId: TimeoutHandle | string): boolean {
    const id = typeof handleOrId === 'string' ? handleOrId : handleOrId.id;
    const handle = this.timeouts.get(id);
    
    if (handle && !handle.cancelled) {
      clearTimeout(handle.timeout);
      handle.cancelled = true;
      this.timeouts.delete(id);
      return true;
    }
    
    return false;
  }

  /**
   * Cancel all active timeouts
   */
  cancelAll(): number {
    let cancelled = 0;
    for (const [id, handle] of this.timeouts) {
      if (!handle.cancelled) {
        clearTimeout(handle.timeout);
        handle.cancelled = true;
        cancelled++;
      }
    }
    this.timeouts.clear();
    return cancelled;
  }

  /**
   * Get remaining time for a timeout
   */
  getRemainingTime(handleOrId: TimeoutHandle | string): number {
    const id = typeof handleOrId === 'string' ? handleOrId : handleOrId.id;
    const handle = this.timeouts.get(id);
    
    if (!handle || handle.cancelled) {
      return 0;
    }
    
    const elapsed = Date.now() - handle.startTime;
    return Math.max(0, handle.duration - elapsed);
  }

  /**
   * Get timeout for specific operation type
   */
  getTimeout(operation: keyof TimeoutConfig): number {
    return this.config[operation] || this.config.default;
  }

  /**
   * Update timeout configuration
   */
  updateConfig(config: Partial<TimeoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get active timeout count
   */
  getActiveCount(): number {
    return this.timeouts.size;
  }

  /**
   * Create a promise that rejects after timeout
   */
  async withTimeout<T>(
    promise: Promise<T>,
    operation: string,
    duration?: number,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const handle = this.createTimeout(operation, duration, () => {
        reject(new TimeoutError(`Operation '${operation}' timed out after ${duration || this.config.default}ms`));
      });

      promise
        .then((result) => {
          this.cancelTimeout(handle);
          resolve(result);
        })
        .catch((error) => {
          this.cancelTimeout(handle);
          reject(error);
        });
    });
  }

  /**
   * Execute function with timeout
   */
  async execute<T>(
    fn: () => Promise<T> | T,
    operation: string,
    duration?: number,
  ): Promise<T> {
    const promise = Promise.resolve(fn());
    return this.withTimeout(promise, operation, duration);
  }
}

/**
 * Custom timeout error
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Adaptive timeout manager that adjusts based on performance
 */
export class AdaptiveTimeoutManager extends TimeoutManager {
  private performanceHistory: Map<string, number[]> = new Map();
  private adjustmentFactor = 1.5;
  private historySize = 10;

  /**
   * Record operation performance
   */
  recordPerformance(operation: string, duration: number): void {
    const history = this.performanceHistory.get(operation) || [];
    history.push(duration);
    
    // Keep only recent history
    if (history.length > this.historySize) {
      history.shift();
    }
    
    this.performanceHistory.set(operation, history);
  }

  /**
   * Get adaptive timeout based on historical performance
   */
  getAdaptiveTimeout(operation: string): number {
    const history = this.performanceHistory.get(operation);
    if (!history || history.length === 0) {
      return this.getTimeout('default');
    }

    // Calculate average duration
    const avg = history.reduce((sum, dur) => sum + dur, 0) / history.length;
    
    // Add buffer based on adjustment factor
    return Math.ceil(avg * this.adjustmentFactor);
  }

  /**
   * Execute with adaptive timeout
   */
  async executeAdaptive<T>(
    fn: () => Promise<T> | T,
    operation: string,
  ): Promise<T> {
    const startTime = Date.now();
    const timeout = this.getAdaptiveTimeout(operation);
    
    try {
      const result = await this.execute(fn, operation, timeout);
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration);
      return result;
    } catch (error) {
      if (error instanceof TimeoutError) {
        // Record timeout as max duration
        this.recordPerformance(operation, timeout);
      }
      throw error;
    }
  }
}

/**
 * Factory functions
 */
export function createTimeoutManager(config?: Partial<TimeoutConfig>): TimeoutManager {
  return new TimeoutManager(config);
}

export function createAdaptiveTimeoutManager(config?: Partial<TimeoutConfig>): AdaptiveTimeoutManager {
  return new AdaptiveTimeoutManager(config);
}