import type { ProviderConfig } from '../config/types';
import type { TranslationRequest, TranslationResponse } from '../types/translation';
/**
 * Base interface for all translation providers
 */
export declare abstract class BaseTranslator {
    protected config: ProviderConfig;
    constructor(config: ProviderConfig);
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
    getModel(): string;
    /**
     * Get max tokens setting
     */
    getMaxTokens(): number;
    /**
     * Get temperature setting
     */
    getTemperature(): number;
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
export declare function parseLLMResponse(response: string, expectedIds: string[]): ParsedTranslationResponse[];
/**
 * Estimate token count for a string (rough approximation)
 */
export declare function estimateTokenCount(text: string): number;
/**
 * Check if a batch would exceed token limits
 */
export declare function wouldExceedTokenLimit(texts: string[], maxTokens: number, overhead?: number): boolean;
//# sourceMappingURL=base.d.ts.map