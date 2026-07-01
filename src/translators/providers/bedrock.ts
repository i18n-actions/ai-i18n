import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { AuthenticationError, RateLimitError, TranslatorError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { ProviderConfig } from '../../config/types';
import type {
  TranslationRequest,
  TranslationResponse,
  TranslatedUnit,
} from '../../types/translation';
import { BaseTranslator, parseLLMResponse } from '../base';
import { buildSystemPrompt, buildUserPrompt } from '../context-builder';
import { withRetry } from '../retry';

/**
 * Shape of errors thrown by the AWS SDK v3 clients.
 */
interface AwsSdkError {
  name?: string;
  message?: string;
  $metadata?: { httpStatusCode?: number };
}

function isAwsSdkError(error: unknown): error is AwsSdkError {
  return typeof error === 'object' && error !== null && ('name' in error || '$metadata' in error);
}

/**
 * AWS Bedrock translator implementation.
 *
 * Uses the model-agnostic Bedrock Converse API, so it works across model
 * families (Anthropic Claude, Meta Llama, Amazon Nova/Titan, Mistral, Cohere,
 * etc.) with a single request/response shape.
 */
export class BedrockTranslator extends BaseTranslator {
  readonly providerName = 'bedrock';
  readonly defaultModel = 'anthropic.claude-3-haiku-20240307-v1:0';

  private client: BedrockRuntimeClient | null = null;

  constructor(config: ProviderConfig) {
    super(config);
  }

  /**
   * Get or create the Bedrock runtime client.
   *
   * When explicit credentials are not provided, the AWS SDK's default
   * credential provider chain is used (env vars, shared config, IAM roles /
   * OIDC, etc.).
   */
  private getClient(): BedrockRuntimeClient {
    if (!this.client) {
      if (!this.config.region) {
        throw new TranslatorError('AWS region is required for bedrock provider', 'bedrock', false);
      }

      this.client = new BedrockRuntimeClient({
        region: this.config.region,
        credentials:
          this.config.accessKeyId && this.config.secretAccessKey
            ? {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
                sessionToken: this.config.sessionToken,
              }
            : undefined,
      });
    }

    return this.client;
  }

  /**
   * Validate configuration
   */
  validateConfig(): void {
    if (!this.config.region) {
      throw new TranslatorError('AWS region is required for bedrock provider', 'bedrock', false);
    }
  }

  /**
   * Check if the Bedrock API is reachable with the configured model.
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.send(
        new ConverseCommand({
          modelId: this.getModel(),
          messages: [{ role: 'user', content: [{ text: 'test' }] }],
          inferenceConfig: { maxTokens: 10 },
        })
      );
      return true;
    } catch (error) {
      logger.warning('Bedrock API availability check failed', {
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
      glossary: request.glossary,
    });

    const userPrompt =
      request.customUserPrompt ??
      buildUserPrompt(request.units, request.sourceLanguage, request.targetLanguage, {
        preserveFormatting: request.preserveFormatting,
        preservePlaceholders: request.preservePlaceholders,
      });

    const expectedIds = request.units.map(u => u.id);

    logger.debug(`Translating ${request.units.length} units with Bedrock ${model}`);

    const input: ConverseCommandInput = {
      modelId: model,
      system: [{ text: systemPrompt }],
      messages: [{ role: 'user', content: [{ text: userPrompt }] }],
      inferenceConfig: {
        maxTokens: this.getMaxTokens(),
        temperature: this.getTemperature(),
      },
    };

    const response = await withRetry(
      async () => {
        try {
          return await client.send(new ConverseCommand(input));
        } catch (error) {
          this.handleApiError(error);
        }
      },
      { maxRetries: 3 }
    );

    // Extract text from the response content blocks
    const responseText = (response.output?.message?.content ?? [])
      .map(block => block.text ?? '')
      .join('');

    if (!responseText) {
      throw new TranslatorError('Empty response from Bedrock', 'bedrock', true);
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

    const usage = response.usage
      ? {
          inputTokens: response.usage.inputTokens ?? 0,
          outputTokens: response.usage.outputTokens ?? 0,
        }
      : undefined;

    return {
      translations,
      usage,
      provider: this.providerName,
      model,
    };
  }

  /**
   * Handle AWS Bedrock errors and convert them to appropriate error types.
   */
  private handleApiError(error: unknown): never {
    if (isAwsSdkError(error)) {
      const name = error.name ?? '';
      const status = error.$metadata?.httpStatusCode;
      const message = error.message ?? (name || 'Unknown error');

      // Authentication / authorization failures (not retryable)
      if (
        status === 401 ||
        status === 403 ||
        name === 'AccessDeniedException' ||
        name === 'UnrecognizedClientException' ||
        name === 'ExpiredTokenException'
      ) {
        throw new AuthenticationError('bedrock', error instanceof Error ? error : undefined);
      }

      // Throttling / rate limiting (retryable)
      if (status === 429 || name === 'ThrottlingException' || name === 'TooManyRequestsException') {
        throw new RateLimitError('bedrock', undefined, error instanceof Error ? error : undefined);
      }

      // Server-side / transient errors (retryable)
      if (
        (status !== undefined && status >= 500) ||
        name === 'InternalServerException' ||
        name === 'ServiceUnavailableException' ||
        name === 'ModelNotReadyException' ||
        name === 'ModelTimeoutException'
      ) {
        throw new TranslatorError(
          `Bedrock API error: ${message}`,
          'bedrock',
          true,
          error instanceof Error ? error : undefined
        );
      }

      throw new TranslatorError(
        `Bedrock API error: ${message}`,
        'bedrock',
        false,
        error instanceof Error ? error : undefined
      );
    }

    throw error;
  }
}
