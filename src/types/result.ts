/**
 * Functional Result type for error handling
 * Inspired by Rust's Result<T, E> and fp-ts Either
 */

/**
 * Success variant of Result
 */
export interface Ok<T> {
  readonly kind: 'ok';
  readonly value: T;
}

/**
 * Error variant of Result
 */
export interface Err<E> {
  readonly kind: 'err';
  readonly error: E;
}

/**
 * Result type - Either success (Ok) or failure (Err)
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Type guards
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => {
  return result.kind === 'ok';
};

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => {
  return result.kind === 'err';
};

/**
 * Constructors
 */
export const ok = <T, E = never>(value: T): Result<T, E> => ({
  kind: 'ok',
  value
} as const);

export const err = <E, T = never>(error: E): Result<T, E> => ({
  kind: 'err',
  error
} as const);

/**
 * Map over the success value
 */
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  return isOk(result) ? ok(fn(result.value)) : result;
};

/**
 * Map over the error value
 */
export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  return isErr(result) ? err(fn(result.error)) : result;
};

/**
 * Chain Result-returning functions
 */
export const chain = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  return isOk(result) ? fn(result.value) : result;
};

/**
 * Extract value with default
 */
export const unwrapOr = <T, E>(
  result: Result<T, E>,
  defaultValue: T
): T => {
  return isOk(result) ? result.value : defaultValue;
};

/**
 * Extract value or throw
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(`Called unwrap on an Err value: ${JSON.stringify(result.error)}`);
};

/**
 * Extract error or throw
 */
export const unwrapErr = <T, E>(result: Result<T, E>): E => {
  if (isErr(result)) {
    return result.error;
  }
  throw new Error('Called unwrapErr on an Ok value');
};

/**
 * Match pattern
 */
export const match = <T, E, R>(
  result: Result<T, E>,
  patterns: {
    ok: (value: T) => R;
    err: (error: E) => R;
  }
): R => {
  return isOk(result) ? patterns.ok(result.value) : patterns.err(result.error);
};

/**
 * Convert to nullable value
 */
export const toNullable = <T, E>(result: Result<T, E>): T | null => {
  return isOk(result) ? result.value : null;
};

/**
 * Create Result from nullable value
 */
export const fromNullable = <T, E>(
  value: T | null | undefined,
  error: E
): Result<T, E> => {
  return value === null || value === undefined ? err(error) : ok(value);
};

/**
 * Create Result from Promise
 */
export const fromPromise = async <T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> => {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(error as E);
  }
};

/**
 * Combine multiple Results
 */
export const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  
  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.value);
  }
  
  return ok(values);
};

/**
 * Try-catch wrapper
 */
export const tryCatch = <T, E = Error>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E> => {
  try {
    return ok(fn());
  } catch (error) {
    return err(onError(error));
  }
};

/**
 * Async try-catch wrapper
 */
export const tryCatchAsync = async <T, E = Error>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>> => {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(onError(error));
  }
};