import { ConfigError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { ProviderConfig, Provider } from '../config/types';
import type { TranslationRequest, TranslationResponse } from '../types/translation';
import { BaseTranslator } from './base';
import { createBatches, TranslationBatch, BatchProcessor } from './batcher';
import { createProviderRateLimiter, RateLimiter } from './rate-limiter';
import { AnthropicTranslator } from './providers/anthropic';
import { OpenAITranslator } from './providers/openai';
import { OllamaTranslator } from './providers/ollama';

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
export function createTranslator(config: ProviderConfig): BaseTranslator {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicTranslator(config);

    case 'openai':
      return new OpenAITranslator(config);

    case 'ollama':
      return new OllamaTranslator(config);

    default:
      throw new ConfigError(`Unknown provider: ${config.provider as string}`);
  }
}

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider: Provider): string {
  switch (provider) {
    case 'anthropic':
      return 'claude-3-haiku-20240307';
    case 'openai':
      return 'gpt-4o-mini';
    case 'ollama':
      return 'llama3.2';
    default:
      throw new ConfigError(`Unknown provider: ${provider as string}`);
  }
}

/**
 * Translation orchestrator that handles batching, rate limiting, and retry
 */
export class TranslationOrchestrator {
  private translator: BaseTranslator;
  private rateLimiter: RateLimiter;
  private options: Required<TranslatorFactoryOptions>;

  constructor(config: ProviderConfig, options?: TranslatorFactoryOptions) {
    this.translator = createTranslator(config);

    this.options = {
      batchSize: options?.batchSize ?? 10,
      maxTokensPerBatch: options?.maxTokensPerBatch ?? 3000,
      rateLimitPerMinute: options?.rateLimitPerMinute ?? 50,
      concurrent: options?.concurrent ?? false,
      concurrencyLimit: options?.concurrencyLimit ?? 2,
    };

    this.rateLimiter = createProviderRateLimiter(config.provider, {
      requestsPerMinute: this.options.rateLimitPerMinute,
    });
  }

  /**
   * Validate translator configuration
   */
  async validate(): Promise<void> {
    this.translator.validateConfig();

    const available = await this.translator.checkAvailability();
    if (!available) {
      throw new ConfigError(
        `Provider ${this.translator.providerName} is not available. Check your configuration.`
      );
    }
  }

  /**
   * Translate a batch of units with full orchestration
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    // Create batches
    const batches = createBatches(request.units, {
      maxBatchSize: this.options.batchSize,
      maxTokensPerBatch: this.options.maxTokensPerBatch,
    });

    if (batches.length === 0) {
      return {
        translations: [],
        provider: this.translator.providerName,
        model: this.translator.getModel(),
      };
    }

    logger.info(`Processing ${request.units.length} units in ${batches.length} batches`);

    // Process batches
    const processor = new BatchProcessor<TranslationBatch, TranslationResponse>(
      async batch => {
        // Wait for rate limiter
        await this.rateLimiter.acquire();

        // Create request for this batch
        const batchRequest: TranslationRequest = {
          ...request,
          units: batch.units,
        };

        return this.translator.translate(batchRequest);
      },
      this.options.concurrent ? this.options.concurrencyLimit : 1
    );

    const results = this.options.concurrent
      ? await processor.processAll(batches)
      : await processor.processSequentially(batches);

    // Aggregate results
    const allTranslations: TranslationResponse['translations'] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let errors = 0;

    for (const result of results) {
      if ('error' in result) {
        errors++;
        logger.error(`Batch translation failed: ${result.error.message}`);
        continue;
      }

      allTranslations.push(...result.result.translations);

      if (result.result.usage) {
        totalInputTokens += result.result.usage.inputTokens;
        totalOutputTokens += result.result.usage.outputTokens;
      }
    }

    if (errors > 0) {
      logger.warning(`${errors} batch(es) failed during translation`);
    }

    return {
      translations: allTranslations,
      usage:
        totalInputTokens > 0 || totalOutputTokens > 0
          ? { inputTokens: totalInputTokens, outputTokens: totalOutputTokens }
          : undefined,
      provider: this.translator.providerName,
      model: this.translator.getModel(),
    };
  }

  /**
   * Get the underlying translator
   */
  getTranslator(): BaseTranslator {
    return this.translator;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.translator.providerName;
  }

  /**
   * Get model name
   */
  getModel(): string {
    return this.translator.getModel();
  }
}

/**
 * Create a translation orchestrator with full configuration
 */
export function createOrchestrator(
  config: ProviderConfig,
  options?: TranslatorFactoryOptions
): TranslationOrchestrator {
  return new TranslationOrchestrator(config, options);
}
