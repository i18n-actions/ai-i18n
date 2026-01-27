import { logger } from '../utils/logger';
import type { TranslationUnit } from '../types/translation';
import { estimateTokenCount } from './base';

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

const DEFAULT_BATCH_OPTIONS: BatchOptions = {
  maxBatchSize: 10,
  maxTokensPerBatch: 3000,
  tokenOverhead: 500,
  preserveGroups: true,
};

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
export function createBatches(
  units: TranslationUnit[],
  options?: Partial<BatchOptions>
): TranslationBatch[] {
  const opts = { ...DEFAULT_BATCH_OPTIONS, ...options };

  if (units.length === 0) {
    return [];
  }

  const batches: TranslationBatch[] = [];
  let currentBatch: TranslationUnit[] = [];
  let currentTokens = opts.tokenOverhead;
  let batchIndex = 0;

  // Group units by file if preserveGroups is enabled
  const groupedUnits = opts.preserveGroups ? groupByFile(units) : [units];

  for (const group of groupedUnits) {
    for (const unit of group) {
      const unitTokens = estimateTokenCount(unit.source) * 2; // Estimate for both input and output

      // Check if adding this unit would exceed limits
      const wouldExceedSize = currentBatch.length >= opts.maxBatchSize;
      const wouldExceedTokens = currentTokens + unitTokens > opts.maxTokensPerBatch;

      if (currentBatch.length > 0 && (wouldExceedSize || wouldExceedTokens)) {
        // Save current batch and start a new one
        batches.push({
          units: currentBatch,
          estimatedTokens: currentTokens,
          index: batchIndex++,
        });

        currentBatch = [];
        currentTokens = opts.tokenOverhead;
      }

      currentBatch.push(unit);
      currentTokens += unitTokens;
    }
  }

  // Add remaining units as final batch
  if (currentBatch.length > 0) {
    batches.push({
      units: currentBatch,
      estimatedTokens: currentTokens,
      index: batchIndex,
    });
  }

  logger.debug(`Created ${batches.length} batches from ${units.length} units`);

  return batches;
}

/**
 * Group units by their source file
 */
function groupByFile(units: TranslationUnit[]): TranslationUnit[][] {
  const groups = new Map<string, TranslationUnit[]>();

  for (const unit of units) {
    const file = unit.metadata.file;
    if (!groups.has(file)) {
      groups.set(file, []);
    }
    groups.get(file)!.push(unit);
  }

  return Array.from(groups.values());
}

/**
 * Split a large batch into smaller ones
 */
export function splitBatch(batch: TranslationBatch, targetSize: number): TranslationBatch[] {
  if (batch.units.length <= targetSize) {
    return [batch];
  }

  const batches: TranslationBatch[] = [];
  let index = 0;

  for (let i = 0; i < batch.units.length; i += targetSize) {
    const units = batch.units.slice(i, i + targetSize);
    const estimatedTokens = units.reduce((sum, u) => sum + estimateTokenCount(u.source) * 2, 500);

    batches.push({
      units,
      estimatedTokens,
      index: batch.index * 1000 + index++,
    });
  }

  return batches;
}

/**
 * Merge small batches together
 */
export function mergeBatches(
  batches: TranslationBatch[],
  options?: Partial<BatchOptions>
): TranslationBatch[] {
  const opts = { ...DEFAULT_BATCH_OPTIONS, ...options };

  if (batches.length <= 1) {
    return batches;
  }

  const merged: TranslationBatch[] = [];
  let currentUnits: TranslationUnit[] = [];
  let currentTokens = opts.tokenOverhead;
  let batchIndex = 0;

  for (const batch of batches) {
    const batchTokens = batch.estimatedTokens - opts.tokenOverhead; // Remove overhead from calculation

    const wouldExceedSize = currentUnits.length + batch.units.length > opts.maxBatchSize;
    const wouldExceedTokens = currentTokens + batchTokens > opts.maxTokensPerBatch;

    if (currentUnits.length > 0 && (wouldExceedSize || wouldExceedTokens)) {
      merged.push({
        units: currentUnits,
        estimatedTokens: currentTokens,
        index: batchIndex++,
      });

      currentUnits = [];
      currentTokens = opts.tokenOverhead;
    }

    currentUnits.push(...batch.units);
    currentTokens += batchTokens;
  }

  if (currentUnits.length > 0) {
    merged.push({
      units: currentUnits,
      estimatedTokens: currentTokens,
      index: batchIndex,
    });
  }

  return merged;
}

/**
 * Processor for handling batches with concurrency control
 */
export class BatchProcessor<T, R> {
  private concurrency: number;
  private processor: (batch: T) => Promise<R>;

  constructor(processor: (batch: T) => Promise<R>, concurrency = 1) {
    this.processor = processor;
    this.concurrency = concurrency;
  }

  /**
   * Process all batches with controlled concurrency
   */
  async processAll(
    batches: T[]
  ): Promise<Array<{ batch: T; result: R } | { batch: T; error: Error }>> {
    const results: Array<{ batch: T; result: R } | { batch: T; error: Error }> = [];

    // Process in chunks based on concurrency
    for (let i = 0; i < batches.length; i += this.concurrency) {
      const chunk = batches.slice(i, i + this.concurrency);

      const chunkResults = await Promise.allSettled(
        chunk.map(async batch => {
          const result = await this.processor(batch);
          return { batch, result };
        })
      );

      for (let j = 0; j < chunkResults.length; j++) {
        const outcome = chunkResults[j];
        const batch = chunk[j];

        if (!outcome || !batch) {
          continue;
        }

        if (outcome.status === 'fulfilled') {
          results.push(outcome.value);
        } else {
          results.push({
            batch,
            error:
              outcome.reason instanceof Error ? outcome.reason : new Error(String(outcome.reason)),
          });
        }
      }
    }

    return results;
  }

  /**
   * Process batches sequentially (for rate-limited APIs)
   */
  async processSequentially(
    batches: T[]
  ): Promise<Array<{ batch: T; result: R } | { batch: T; error: Error }>> {
    const results: Array<{ batch: T; result: R } | { batch: T; error: Error }> = [];

    for (const batch of batches) {
      try {
        const result = await this.processor(batch);
        results.push({ batch, result });
      } catch (error) {
        results.push({
          batch,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return results;
  }
}
