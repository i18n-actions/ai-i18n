import OpenAI from 'openai';
import { AuthenticationError, RateLimitError, TranslatorError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { ProviderConfig } from '../../config/types';
import type { TranslationRequest, TranslationResponse, TranslatedUnit } from '../../types/translation';
import { BaseTranslator, parseLLMResponse } from '../base';
import { buildSystemPrompt, buildUserPrompt } from '../context-builder';
import { withRetry } from '../retry';

/**
 * OpenAI GPT translator implementation
 */
export class OpenAITranslator extends BaseTranslator {
  readonly providerName = 'openai';
  readonly defaultModel = 'gpt-4o-mini';

  private client: OpenAI | null = null;

  constructor(config: ProviderConfig) {
    super(config);
  }

  /**
   * Get or create OpenAI client
   */
  private getClient(): OpenAI {
    if (!this.client) {
      if (!this.config.apiKey) {
        throw new AuthenticationError('openai');
      }

      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
      });
    }

    return this.client;
  }

  /**
   * Validate configuration
   */
  validateConfig(): void {
    if (!this.config.apiKey) {
      throw new AuthenticationError('openai');
    }
  }

  /**
   * Check if the API is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const client = this.getClient();
      // Make a minimal API call to check connectivity
      await client.chat.completions.create({
        model: this.getModel(),
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      logger.warning('OpenAI API availability check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Translate a batch of units
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    this.validateConfig();

    const client = this.getClient();
    const model = this.getModel();

    const systemPrompt = buildSystemPrompt(request.sourceLanguage, request.targetLanguage, {
      userContext: request.context,
      preserveFormatting: request.preserveFormatting,
      preservePlaceholders: request.preservePlaceholders,
    });

    const userPrompt = buildUserPrompt(
      request.units,
      request.sourceLanguage,
      request.targetLanguage,
      {
        preserveFormatting: request.preserveFormatting,
        preservePlaceholders: request.preservePlaceholders,
      }
    );

    const expectedIds = request.units.map(u => u.id);

    logger.debug(`Translating ${request.units.length} units with OpenAI ${model}`);

    const response = await withRetry(
      async () => {
        try {
          return await client.chat.completions.create({
            model,
            max_tokens: this.getMaxTokens(),
            temperature: this.getTemperature(),
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          });
        } catch (error) {
          this.handleApiError(error);
          throw error;
        }
      },
      { maxRetries: 3 }
    );

    // Extract text from response
    const responseText = response.choices[0]?.message?.content ?? '';

    if (!responseText) {
      throw new TranslatorError('Empty response from OpenAI', 'openai', true);
    }

    // Parse response
    const parsed = parseLLMResponse(responseText, expectedIds);

    // Map back to units
    const translations: TranslatedUnit[] = [];
    const parsedMap = new Map(parsed.map(p => [p.id, p.translation]));

    for (const unit of request.units) {
      const translation = parsedMap.get(unit.id);
      if (translation) {
        translations.push({
          id: unit.id,
          source: unit.source,
          target: translation,
        });
      } else {
        logger.warning(`No translation returned for unit: ${unit.id}`);
      }
    }

    return {
      translations,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
      provider: this.providerName,
      model,
    };
  }

  /**
   * Handle API errors and convert to appropriate error types
   */
  private handleApiError(error: unknown): never {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new AuthenticationError('openai', error);
      }

      if (error.status === 429) {
        // Try to extract retry-after header
        const retryAfter = error.headers?.['retry-after'];
        throw new RateLimitError(
          'openai',
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          error
        );
      }

      if (error.status === 500 || error.status === 502 || error.status === 503) {
        throw new TranslatorError(
          `OpenAI API error: ${error.message}`,
          'openai',
          true,
          error
        );
      }

      throw new TranslatorError(
        `OpenAI API error: ${error.message}`,
        'openai',
        false,
        error
      );
    }

    throw error;
  }
}
