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
/**
 * Calculate delay for a retry attempt with exponential backoff
 */
export declare function calculateDelay(attempt: number, options: RetryOptions): number;
/**
 * Sleep for a specified duration
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Determine if an error is retryable
 */
export declare function isRetryableError(error: unknown): boolean;
/**
 * Get retry-after duration from error if available
 */
export declare function getRetryAfter(error: unknown): number | undefined;
/**
 * Execute a function with retry logic
 */
export declare function withRetry<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T>;
/**
 * Create a retry wrapper with preset options
 */
export declare function createRetryWrapper(options?: Partial<RetryOptions>): <T>(fn: () => Promise<T>) => Promise<T>;
/**
 * Retry decorator for class methods
 */
export declare function Retry(options?: Partial<RetryOptions>): (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=retry.d.ts.map