import type { ProviderConfig } from '../../config/types';
import type { TranslationRequest, TranslationResponse } from '../../types/translation';
import { BaseTranslator } from '../base';
/**
 * Anthropic Claude translator implementation
 */
export declare class AnthropicTranslator extends BaseTranslator {
    readonly providerName = "anthropic";
    readonly defaultModel = "claude-3-haiku-20240307";
    private client;
    constructor(config: ProviderConfig);
    /**
     * Get or create Anthropic client
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
//# sourceMappingURL=anthropic.d.ts.map