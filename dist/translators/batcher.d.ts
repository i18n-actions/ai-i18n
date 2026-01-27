import type { TranslationUnit } from '../types/translation';
/**
 * Options for batching translation units
 */
export interface BatchOptions {
    /**
     * Maximum units per batch
     */
    maxBatchSize: number;
    /**
     * Maximum estimated tokens per batch
     */
    maxTokensPerBatch: number;
    /**
     * Token overhead per batch (for prompt template)
     */
    tokenOverhead: number;
    /**
     * Whether to keep related strings together
     */
    preserveGroups: boolean;
}
/**
 * A batch of translation units
 */
export interface TranslationBatch {
    units: TranslationUnit[];
    estimatedTokens: number;
    index: number;
}
/**
 * Create batches from translation units
 */
export declare function createBatches(units: TranslationUnit[], options?: Partial<BatchOptions>): TranslationBatch[];
/**
 * Split a large batch into smaller ones
 */
export declare function splitBatch(batch: TranslationBatch, targetSize: number): TranslationBatch[];
/**
 * Merge small batches together
 */
export declare function mergeBatches(batches: TranslationBatch[], options?: Partial<BatchOptions>): TranslationBatch[];
/**
 * Processor for handling batches with concurrency control
 */
export declare class BatchProcessor<T, R> {
    private concurrency;
    private processor;
    constructor(processor: (batch: T) => Promise<R>, concurrency?: number);
    /**
     * Process all batches with controlled concurrency
     */
    processAll(batches: T[]): Promise<Array<{
        batch: T;
        result: R;
    } | {
        batch: T;
        error: Error;
    }>>;
    /**
     * Process batches sequentially (for rate-limited APIs)
     */
    processSequentially(batches: T[]): Promise<Array<{
        batch: T;
        result: R;
    } | {
        batch: T;
        error: Error;
    }>>;
}
//# sourceMappingURL=batcher.d.ts.map