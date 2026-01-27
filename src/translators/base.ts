import type { ProviderConfig } from '../config/types';
import type { TranslationRequest, TranslationResponse } from '../types/translation';

/**
 * Base interface for all translation providers
 */
export abstract class BaseTranslator {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * The provider name
   */
  abstract readonly providerName: string;

  /**
   * Default model for this provider
   */
  abstract readonly defaultModel: string;

  /**
   * Translate a batch of translation units
   */
  abstract translate(request: TranslationRequest): Promise<TranslationResponse>;

  /**
   * Validate provider configuration
   * @throws {ConfigError} if configuration is invalid
   */
  abstract validateConfig(): void;

  /**
   * Check if the provider is available (e.g., API is reachable)
   */
  abstract checkAvailability(): Promise<boolean>;

  /**
   * Get the model being used
   */
  getModel(): string {
    return this.config.model ?? this.defaultModel;
  }

  /**
   * Get max tokens setting
   */
  getMaxTokens(): number {
    return this.config.maxTokens ?? 4096;
  }

  /**
   * Get temperature setting
   */
  getTemperature(): number {
    return this.config.temperature ?? 0.3;
  }
}

/**
 * Response from an LLM containing translated strings
 */
export interface LLMTranslationResult {
  translations: Array<{
    id: string;
    translation: string;
  }>;
}

/**
 * Parsed response with confidence scores
 */
export interface ParsedTranslationResponse {
  id: string;
  source: string;
  translation: string;
  confidence?: number;
}

/**
 * Parse LLM response containing JSON with translations
 */
export function parseLLMResponse(
  response: string,
  expectedIds: string[]
): ParsedTranslationResponse[] {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in LLM response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as LLMTranslationResult;

    if (!parsed.translations || !Array.isArray(parsed.translations)) {
      throw new Error('Invalid response format: missing translations array');
    }

    const results: ParsedTranslationResponse[] = [];

    for (const item of parsed.translations) {
      if (typeof item.id !== 'string' || typeof item.translation !== 'string') {
        continue;
      }

      if (!expectedIds.includes(item.id)) {
        continue;
      }

      results.push({
        id: item.id,
        source: '', // Will be filled by caller
        translation: item.translation,
      });
    }

    return results;
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Estimate token count for a string (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English
  // This is a simplification; actual tokenization varies by model
  return Math.ceil(text.length / 4);
}

/**
 * Check if a batch would exceed token limits
 */
export function wouldExceedTokenLimit(
  texts: string[],
  maxTokens: number,
  overhead = 500 // Reserve tokens for prompt template
): boolean {
  const totalEstimate = texts.reduce((sum, text) => sum + estimateTokenCount(text), 0) + overhead;
  return totalEstimate > maxTokens;
}
