import type { ProviderConfig } from '../../config/types';
import type { TranslationRequest, TranslationResponse } from '../../types/translation';
import { BaseTranslator } from '../base';
/**
 * OpenAI GPT translator implementation
 */
export declare class OpenAITranslator extends BaseTranslator {
    readonly providerName = "openai";
    readonly defaultModel = "gpt-4o-mini";
    private client;
    constructor(config: ProviderConfig);
    /**
     * Get or create OpenAI client
     */
    private getClient;
    /**
     * Validate configuration
     */
    validateConfig(): void;
    /**
     * Check if the API is available
     */
    checkAvailability(): Promise<boolean>;
    /**
     * Translate a batch of units
     */
    translate(request: TranslationRequest): Promise<TranslationResponse>;
    /**
     * Handle API errors and convert to appropriate error types
     */
    private handleApiError;
}
//# sourceMappingURL=openai.d.ts.map