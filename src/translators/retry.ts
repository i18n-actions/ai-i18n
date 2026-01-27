import { logger } from '../utils/logger';
import { RateLimitError, TranslatorError } from '../utils/errors';

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;

  /**
   * Initial delay in milliseconds before first retry
   */
  initialDelayMs: number;

  /**
   * Maximum delay in milliseconds between retries
   */
  maxDelayMs: number;

  /**
   * Multiplier for exponential backoff
   */
  backoffMultiplier: number;

  /**
   * Whether to add jitter to delays
   */
  jitter: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Calculate delay for a retry attempt with exponential backoff
 */
export function calculateDelay(attempt: number, options: RetryOptions): number {
  let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);

  // Cap at max delay
  delay = Math.min(delay, options.maxDelayMs);

  // Add jitter (0-25% random variation)
  if (options.jitter) {
    const jitterFactor = 1 + Math.random() * 0.25;
    delay *= jitterFactor;
  }

  return Math.floor(delay);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }

  if (error instanceof TranslatorError) {
    return error.isRetryable;
  }

  // Check for common retryable HTTP errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('socket hang up') ||
      message.includes('network') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('rate limit')
    );
  }

  return false;
}

/**
 * Get retry-after duration from error if available
 */
export function getRetryAfter(error: unknown): number | undefined {
  if (error instanceof RateLimitError) {
    return error.retryAfter;
  }

  return undefined;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if not retryable or out of retries
      if (!isRetryableError(error) || attempt >= opts.maxRetries) {
        throw error;
      }

      // Calculate delay
      let delay = calculateDelay(attempt, opts);

      // Use retry-after header if available
      const retryAfter = getRetryAfter(error);
      if (retryAfter !== undefined && retryAfter > 0) {
        delay = Math.max(delay, retryAfter * 1000);
      }

      logger.warning(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
        error: lastError.message,
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper with preset options
 */
export function createRetryWrapper(
  options?: Partial<RetryOptions>
): <T>(fn: () => Promise<T>) => Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  return <T>(fn: () => Promise<T>) => withRetry(fn, opts);
}

/**
 * Retry decorator for class methods
 */
export function Retry(
  options?: Partial<RetryOptions>
): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };

  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      return withRetry(() => originalMethod.apply(this, args), opts);
    };

    return descriptor;
  };
}
