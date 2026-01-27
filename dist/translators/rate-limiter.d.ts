/**
 * Options for rate limiting
 */
export interface RateLimiterOptions {
    /**
     * Maximum requests per minute
     */
    requestsPerMinute: number;
    /**
     * Maximum tokens per minute (optional)
     */
    tokensPerMinute?: number;
    /**
     * Burst allowance (extra requests allowed in short periods)
     */
    burstAllowance?: number;
}
/**
 * Token bucket rate limiter
 */
export declare class RateLimiter {
    private tokens;
    private maxTokens;
    private refillRate;
    private lastRefill;
    private tokensPerMinute?;
    private tokenBudget?;
    private lastTokenRefill?;
    constructor(options: RateLimiterOptions);
    /**
     * Refill tokens based on elapsed time
     */
    private refill;
    /**
     * Try to acquire a token (non-blocking)
     */
    tryAcquire(tokenCount?: number): boolean;
    /**
     * Acquire a token, waiting if necessary
     */
    acquire(tokenCount?: number): Promise<void>;
    /**
     * Get current available tokens
     */
    getAvailableTokens(): number;
    /**
     * Get time until next token is available (in ms)
     */
    getWaitTime(): number;
    /**
     * Reset the rate limiter
     */
    reset(): void;
}
/**
 * Sliding window rate limiter for more accurate rate limiting
 */
export declare class SlidingWindowRateLimiter {
    private windowMs;
    private maxRequests;
    private requests;
    constructor(requestsPerMinute: number);
    /**
     * Clean up old requests outside the window
     */
    private cleanup;
    /**
     * Check if a request can be made
     */
    canRequest(): boolean;
    /**
     * Record a request
     */
    recordRequest(): void;
    /**
     * Try to make a request (non-blocking)
     */
    tryAcquire(): boolean;
    /**
     * Acquire permission to make a request, waiting if necessary
     */
    acquire(): Promise<void>;
    /**
     * Get current request count in window
     */
    getRequestCount(): number;
    /**
     * Get time until next request is allowed (in ms)
     */
    getWaitTime(): number;
}
/**
 * Provider-specific rate limiters with default limits
 */
export declare const PROVIDER_RATE_LIMITS: Record<string, RateLimiterOptions>;
/**
 * Create a rate limiter for a specific provider
 */
export declare function createProviderRateLimiter(provider: string, customOptions?: Partial<RateLimiterOptions>): RateLimiter;
//# sourceMappingURL=rate-limiter.d.ts.map