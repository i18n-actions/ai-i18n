import type { ProviderConfig, Provider } from '../config/types';
import type { TranslationRequest, TranslationResponse } from '../types/translation';
import { BaseTranslator } from './base';
/**
 * Options for the translator factory
 */
export interface TranslatorFactoryOptions {
    /**
     * Batch size for translations
     */
    batchSize?: number;
    /**
     * Maximum tokens per batch
     */
    maxTokensPerBatch?: number;
    /**
     * Custom rate limit (requests per minute)
     */
    rateLimitPerMinute?: number;
    /**
     * Whether to process batches concurrently
     */
    concurrent?: boolean;
    /**
     * Concurrency limit for parallel processing
     */
    concurrencyLimit?: number;
}
/**
 * Create a translator instance for a provider
 */
export declare function createTranslator(config: ProviderConfig): BaseTranslator;
/**
 * Get the default model for a provider
 */
export declare function getDefaultModel(provider: Provider): string;
/**
 * Translation orchestrator that handles batching, rate limiting, and retry
 */
export declare class TranslationOrchestrator {
    private translator;
    private rateLimiter;
    private options;
    constructor(config: ProviderConfig, options?: TranslatorFactoryOptions);
    /**
     * Validate translator configuration
     */
    validate(): Promise<void>;
    /**
     * Translate a batch of units with full orchestration
     */
    translate(request: TranslationRequest): Promise<TranslationResponse>;
    /**
     * Get the underlying translator
     */
    getTranslator(): BaseTranslator;
    /**
     * Get provider name
     */
    getProviderName(): string;
    /**
     * Get model name
     */
    getModel(): string;
}
/**
 * Create a translation orchestrator with full configuration
 */
export declare function createOrchestrator(config: ProviderConfig, options?: TranslatorFactoryOptions): TranslationOrchestrator;
//# sourceMappingURL=factory.d.ts.map