import { ConfigError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { ProviderConfig, Provider } from '../config/types';
import type { TranslationRequest, TranslationResponse, TranslatedUnit } from '../types/translation';
import { BaseTranslator } from './base';
import { createBatches, TranslationBatch, BatchProcessor } from './batcher';
import { findMissingPlaceholders, buildPlaceholderRetryPrompt } from './context-builder';
import { createProviderRateLimiter, RateLimiter } from './rate-limiter';
import { AnthropicTranslator } from './providers/anthropic';
import { OpenAITranslator } from './providers/openai';
import { OllamaTranslator } from './providers/ollama';
import { BedrockTranslator } from './providers/bedrock';

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

    case 'bedrock':
      return new BedrockTranslator(config);

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
    case 'bedrock':
      return 'anthropic.claude-3-haiku-20240307-v1:0';
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

    // Retry missing units
    const translatedIds = new Set(allTranslations.map(t => t.id));
    const missingUnits = request.units.filter(u => !translatedIds.has(u.id));

    if (missingUnits.length > 0) {
      logger.info(`Retrying ${missingUnits.length} missing unit(s)...`);

      const retryResponse = await this.retryMissingUnits(missingUnits, request);

      allTranslations.push(...retryResponse.translations);

      if (retryResponse.usage) {
        totalInputTokens += retryResponse.usage.inputTokens;
        totalOutputTokens += retryResponse.usage.outputTokens;
      }
    }

    // Validate placeholder completeness and retry broken translations
    if (request.preservePlaceholders) {
      const sourceMap = new Map(request.units.map(u => [u.id, u.source]));
      const broken: Array<{
        id: string;
        source: string;
        brokenTarget: string;
        missing: string[];
      }> = [];

      for (const t of allTranslations) {
        const source = sourceMap.get(t.id);
        if (!source) {
          continue;
        }
        const missing = findMissingPlaceholders(source, t.target);
        if (missing.length > 0) {
          broken.push({ id: t.id, source, brokenTarget: t.target, missing });
        }
      }

      if (broken.length > 0) {
        logger.info(`Retrying ${broken.length} translation(s) with missing placeholders...`);

        const placeholderRetryResponse = await this.retryBrokenPlaceholders(broken, request);

        // Build a lookup of retry results
        const retryMap = new Map(placeholderRetryResponse.translations.map(t => [t.id, t]));

        // Replace broken translations only when the retry actually fixed them
        for (let i = 0; i < allTranslations.length; i++) {
          const retried = retryMap.get(allTranslations[i].id);
          if (!retried) {
            continue;
          }
          const source = sourceMap.get(retried.id)!;
          const stillMissing = findMissingPlaceholders(source, retried.target);
          if (stillMissing.length === 0) {
            allTranslations[i] = retried;
          } else {
            logger.warning(
              `Placeholder retry still incomplete for ${retried.id}, keeping original. Missing: ${stillMissing.join(', ')}`
            );
          }
        }

        if (placeholderRetryResponse.usage) {
          totalInputTokens += placeholderRetryResponse.usage.inputTokens;
          totalOutputTokens += placeholderRetryResponse.usage.outputTokens;
        }
      }
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
   * Retry translations that have missing placeholders with a targeted prompt
   */
  private async retryBrokenPlaceholders(
    broken: Array<{ id: string; source: string; brokenTarget: string; missing: string[] }>,
    originalRequest: TranslationRequest
  ): Promise<TranslationResponse> {
    const allTranslations: TranslatedUnit[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Batch broken translations (max 5 per batch, matching existing retry pattern)
    for (let i = 0; i < broken.length; i += 5) {
      const batch = broken.slice(i, i + 5);

      const customUserPrompt = buildPlaceholderRetryPrompt(
        batch,
        originalRequest.sourceLanguage,
        originalRequest.targetLanguage
      );

      // Build units for the batch so the provider can map IDs back
      const batchUnits = batch.map(b => {
        const unit = originalRequest.units.find(u => u.id === b.id);
        return unit!;
      });

      try {
        await this.rateLimiter.acquire();

        const batchRequest: TranslationRequest = {
          ...originalRequest,
          units: batchUnits,
          customUserPrompt,
        };

        const result = await this.translator.translate(batchRequest);
        allTranslations.push(...result.translations);

        if (result.usage) {
          totalInputTokens += result.usage.inputTokens;
          totalOutputTokens += result.usage.outputTokens;
        }
      } catch (error) {
        logger.warning(
          `Placeholder retry batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
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
   * Retry translating missing units with smaller batch sizes
   */
  private async retryMissingUnits(
    missingUnits: TranslationRequest['units'],
    originalRequest: TranslationRequest,
    maxRetries = 2
  ): Promise<TranslationResponse> {
    const allTranslations: TranslationResponse['translations'] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let remainingUnits = [...missingUnits];

    for (let attempt = 0; attempt < maxRetries && remainingUnits.length > 0; attempt++) {
      // Use smaller batches for retries (5 units max)
      const retryBatchSize = Math.min(5, Math.ceil(this.options.batchSize / 10));
      const batches = createBatches(remainingUnits, {
        maxBatchSize: retryBatchSize,
        maxTokensPerBatch: this.options.maxTokensPerBatch,
      });

      logger.debug(
        `Retry attempt ${attempt + 1}: ${remainingUnits.length} units in ${batches.length} batches`
      );

      for (const batch of batches) {
        try {
          await this.rateLimiter.acquire();

          const batchRequest: TranslationRequest = {
            ...originalRequest,
            units: batch.units,
          };

          const result = await this.translator.translate(batchRequest);
          allTranslations.push(...result.translations);

          if (result.usage) {
            totalInputTokens += result.usage.inputTokens;
            totalOutputTokens += result.usage.outputTokens;
          }
        } catch (error) {
          logger.warning(
            `Retry batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Check what's still missing
      const translatedIds = new Set(allTranslations.map(t => t.id));
      remainingUnits = remainingUnits.filter(u => !translatedIds.has(u.id));
    }

    if (remainingUnits.length > 0) {
      logger.warning(`${remainingUnits.length} unit(s) could not be translated after retries`);
      for (const unit of remainingUnits) {
        logger.warning(`  Failed unit: ${unit.id}`);
      }
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
