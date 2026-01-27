import axios, { AxiosInstance, AxiosError } from 'axios';
import { ConfigError, TranslatorError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { ProviderConfig } from '../../config/types';
import type { TranslationRequest, TranslationResponse, TranslatedUnit } from '../../types/translation';
import { BaseTranslator, parseLLMResponse } from '../base';
import { buildSystemPrompt, buildUserPrompt } from '../context-builder';
import { withRetry } from '../retry';

/**
 * Ollama API response for chat completion
 */
interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama local translator implementation
 */
export class OllamaTranslator extends BaseTranslator {
  readonly providerName = 'ollama';
  readonly defaultModel = 'llama3.2';

  private client: AxiosInstance | null = null;

  constructor(config: ProviderConfig) {
    super(config);
  }

  /**
   * Get or create Axios client for Ollama
   */
  private getClient(): AxiosInstance {
    if (!this.client) {
      const baseUrl = this.config.baseUrl ?? 'http://localhost:11434';

      this.client = axios.create({
        baseURL: baseUrl,
        timeout: 120000, // 2 minutes for local models
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return this.client;
  }

  /**
   * Validate configuration
   */
  validateConfig(): void {
    if (!this.config.model) {
      throw new ConfigError('Model is required for Ollama provider');
    }
  }

  /**
   * Check if Ollama is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.get('/api/tags');
      return true;
    } catch (error) {
      logger.warning('Ollama availability check failed', {
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

    logger.debug(`Translating ${request.units.length} units with Ollama ${model}`);

    const response = await withRetry(
      async () => {
        try {
          const result = await client.post<OllamaChatResponse>('/api/chat', {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            stream: false,
            format: 'json',
            options: {
              temperature: this.getTemperature(),
              num_predict: this.getMaxTokens(),
            },
          });

          return result.data;
        } catch (error) {
          this.handleApiError(error);
          throw error;
        }
      },
      { maxRetries: 2 } // Fewer retries for local model
    );

    // Extract text from response
    const responseText = response.message?.content ?? '';

    if (!responseText) {
      throw new TranslatorError('Empty response from Ollama', 'ollama', true);
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

    // Calculate rough token estimates from Ollama metrics
    const usage = response.prompt_eval_count !== undefined && response.eval_count !== undefined
      ? {
          inputTokens: response.prompt_eval_count,
          outputTokens: response.eval_count,
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
   * Handle API errors and convert to appropriate error types
   */
  private handleApiError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.code === 'ECONNREFUSED') {
        throw new TranslatorError(
          'Cannot connect to Ollama. Make sure Ollama is running.',
          'ollama',
          true,
          error
        );
      }

      if (axiosError.response?.status === 404) {
        throw new TranslatorError(
          `Model not found. Run 'ollama pull ${this.getModel()}' to download it.`,
          'ollama',
          false,
          error
        );
      }

      if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
        throw new TranslatorError(
          'Ollama request timed out. The model may be too large or the input too long.',
          'ollama',
          true,
          error
        );
      }

      throw new TranslatorError(
        `Ollama error: ${axiosError.message}`,
        'ollama',
        true,
        error
      );
    }

    throw error;
  }

  /**
   * List available models on the Ollama server
   */
  async listModels(): Promise<string[]> {
    try {
      const client = this.getClient();
      const response = await client.get<{ models: Array<{ name: string }> }>('/api/tags');
      return response.data.models.map(m => m.name);
    } catch (error) {
      logger.warning('Failed to list Ollama models', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Pull a model if not available
   */
  async pullModel(modelName: string): Promise<void> {
    const client = this.getClient();

    logger.info(`Pulling Ollama model: ${modelName}`);

    try {
      await client.post('/api/pull', { name: modelName, stream: false });
      logger.info(`Successfully pulled model: ${modelName}`);
    } catch (error) {
      throw new TranslatorError(
        `Failed to pull model ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ollama',
        false,
        error instanceof Error ? error : undefined
      );
    }
  }
}
