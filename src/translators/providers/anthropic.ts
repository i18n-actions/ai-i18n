import Anthropic from '@anthropic-ai/sdk';
import { AuthenticationError, RateLimitError, TranslatorError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { ProviderConfig } from '../../config/types';
import type { TranslationRequest, TranslationResponse, TranslatedUnit } from '../../types/translation';
import { BaseTranslator, parseLLMResponse } from '../base';
import { buildSystemPrompt, buildUserPrompt } from '../context-builder';
import { withRetry } from '../retry';

/**
 * Anthropic Claude translator implementation
 */
export class AnthropicTranslator extends BaseTranslator {
  readonly providerName = 'anthropic';
  readonly defaultModel = 'claude-3-haiku-20240307';

  private client: Anthropic | null = null;

  constructor(config: ProviderConfig) {
    super(config);
  }

  /**
   * Get or create Anthropic client
   */
  private getClient(): Anthropic {
    if (!this.client) {
      if (!this.config.apiKey) {
        throw new AuthenticationError('anthropic');
      }

      this.client = new Anthropic({
        apiKey: this.config.apiKey,
      });
    }

    return this.client;
  }

  /**
   * Validate configuration
   */
  validateConfig(): void {
    if (!this.config.apiKey) {
      throw new AuthenticationError('anthropic');
    }
  }

  /**
   * Check if the API is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const client = this.getClient();
      // Make a minimal API call to check connectivity
      await client.messages.create({
        model: this.getModel(),
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      logger.warning('Anthropic API availability check failed', {
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

    logger.debug(`Translating ${request.units.length} units with Anthropic ${model}`);

    const response = await withRetry(
      async () => {
        try {
          return await client.messages.create({
            model,
            max_tokens: this.getMaxTokens(),
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          });
        } catch (error) {
          this.handleApiError(error);
          throw error;
        }
      },
      { maxRetries: 3 }
    );

    // Extract text from response
    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('');

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
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      provider: this.providerName,
      model,
    };
  }

  /**
   * Handle API errors and convert to appropriate error types
   */
  private handleApiError(error: unknown): never {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        throw new AuthenticationError('anthropic', error);
      }

      if (error.status === 429) {
        // Try to extract retry-after header
        const retryAfter = error.headers?.['retry-after'];
        throw new RateLimitError(
          'anthropic',
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          error
        );
      }

      if (error.status === 500 || error.status === 502 || error.status === 503) {
        throw new TranslatorError(
          `Anthropic API error: ${error.message}`,
          'anthropic',
          true,
          error
        );
      }

      throw new TranslatorError(
        `Anthropic API error: ${error.message}`,
        'anthropic',
        false,
        error
      );
    }

    throw error;
  }
}
