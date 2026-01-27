import { sleep } from './retry';

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
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per ms
  private lastRefill: number;
  private tokensPerMinute?: number;
  private tokenBudget?: number;
  private lastTokenRefill?: number;

  constructor(options: RateLimiterOptions) {
    const burstAllowance = options.burstAllowance ?? 0;
    this.maxTokens = options.requestsPerMinute + burstAllowance;
    this.tokens = this.maxTokens;
    this.refillRate = options.requestsPerMinute / 60000; // per ms
    this.lastRefill = Date.now();

    if (options.tokensPerMinute) {
      this.tokensPerMinute = options.tokensPerMinute;
      this.tokenBudget = options.tokensPerMinute;
      this.lastTokenRefill = Date.now();
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;

    // Refill API token budget
    if (this.tokensPerMinute !== undefined && this.lastTokenRefill !== undefined) {
      const tokenElapsed = now - this.lastTokenRefill;
      const tokenRate = this.tokensPerMinute / 60000;
      const budgetToAdd = tokenElapsed * tokenRate;

      this.tokenBudget = Math.min(this.tokensPerMinute, (this.tokenBudget ?? 0) + budgetToAdd);
      this.lastTokenRefill = now;
    }
  }

  /**
   * Try to acquire a token (non-blocking)
   */
  tryAcquire(tokenCount = 0): boolean {
    this.refill();

    if (this.tokens < 1) {
      return false;
    }

    // Check token budget if applicable
    if (this.tokenBudget !== undefined && tokenCount > 0) {
      if (this.tokenBudget < tokenCount) {
        return false;
      }
      this.tokenBudget -= tokenCount;
    }

    this.tokens -= 1;
    return true;
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(tokenCount = 0): Promise<void> {
    while (!this.tryAcquire(tokenCount)) {
      // Calculate wait time
      const tokensNeeded = 1 - this.tokens;
      const waitTime = Math.ceil(tokensNeeded / this.refillRate);
      await sleep(Math.max(waitTime, 100)); // At least 100ms
    }
  }

  /**
   * Get current available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get time until next token is available (in ms)
   */
  getWaitTime(): number {
    this.refill();

    if (this.tokens >= 1) {
      return 0;
    }

    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();

    if (this.tokensPerMinute !== undefined) {
      this.tokenBudget = this.tokensPerMinute;
      this.lastTokenRefill = Date.now();
    }
  }
}

/**
 * Sliding window rate limiter for more accurate rate limiting
 */
export class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requests: number[] = [];

  constructor(requestsPerMinute: number) {
    this.windowMs = 60000; // 1 minute
    this.maxRequests = requestsPerMinute;
  }

  /**
   * Clean up old requests outside the window
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    this.requests = this.requests.filter(time => time > cutoff);
  }

  /**
   * Check if a request can be made
   */
  canRequest(): boolean {
    this.cleanup();
    return this.requests.length < this.maxRequests;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * Try to make a request (non-blocking)
   */
  tryAcquire(): boolean {
    if (this.canRequest()) {
      this.recordRequest();
      return true;
    }
    return false;
  }

  /**
   * Acquire permission to make a request, waiting if necessary
   */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      this.cleanup();

      if (this.requests.length === 0) {
        break;
      }

      // Wait until the oldest request expires
      const oldestRequest = this.requests[0];
      if (oldestRequest !== undefined) {
        const waitTime = oldestRequest + this.windowMs - Date.now();
        if (waitTime > 0) {
          await sleep(waitTime + 10); // Small buffer
        }
      }
    }
  }

  /**
   * Get current request count in window
   */
  getRequestCount(): number {
    this.cleanup();
    return this.requests.length;
  }

  /**
   * Get time until next request is allowed (in ms)
   */
  getWaitTime(): number {
    this.cleanup();

    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    const oldestRequest = this.requests[0];
    if (oldestRequest === undefined) {
      return 0;
    }

    return Math.max(0, oldestRequest + this.windowMs - Date.now());
  }
}

/**
 * Provider-specific rate limiters with default limits
 */
export const PROVIDER_RATE_LIMITS: Record<string, RateLimiterOptions> = {
  anthropic: {
    requestsPerMinute: 50,
    tokensPerMinute: 100000,
    burstAllowance: 5,
  },
  openai: {
    requestsPerMinute: 60,
    tokensPerMinute: 150000,
    burstAllowance: 10,
  },
  ollama: {
    requestsPerMinute: 120, // Local, so more lenient
    burstAllowance: 20,
  },
};

/**
 * Create a rate limiter for a specific provider
 */
export function createProviderRateLimiter(
  provider: string,
  customOptions?: Partial<RateLimiterOptions>
): RateLimiter {
  const defaultOptions = PROVIDER_RATE_LIMITS[provider] ?? {
    requestsPerMinute: 30,
    burstAllowance: 5,
  };

  return new RateLimiter({
    ...defaultOptions,
    ...customOptions,
  });
}
