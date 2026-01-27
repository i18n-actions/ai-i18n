import type { ProviderConfig } from '../../config/types';
import type { TranslationRequest, TranslationResponse } from '../../types/translation';
import { BaseTranslator } from '../base';
/**
 * Ollama local translator implementation
 */
export declare class OllamaTranslator extends BaseTranslator {
    readonly providerName = "ollama";
    readonly defaultModel = "llama3.2";
    private client;
    constructor(config: ProviderConfig);
    /**
     * Get or create Axios client for Ollama
     */
    private getClient;
    /**
     * Validate configuration
     */
    validateConfig(): void;
    /**
     * Check if Ollama is available
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
    /**
     * List available models on the Ollama server
     */
    listModels(): Promise<string[]>;
    /**
     * Pull a model if not available
     */
    pullModel(modelName: string): Promise<void>;
}
//# sourceMappingURL=ollama.d.ts.map