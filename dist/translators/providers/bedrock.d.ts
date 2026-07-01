import type { ProviderConfig } from '../../config/types';
import type { TranslationRequest, TranslationResponse } from '../../types/translation';
import { BaseTranslator } from '../base';
/**
 * AWS Bedrock translator implementation.
 *
 * Uses the model-agnostic Bedrock Converse API, so it works across model
 * families (Anthropic Claude, Meta Llama, Amazon Nova/Titan, Mistral, Cohere,
 * etc.) with a single request/response shape.
 */
export declare class BedrockTranslator extends BaseTranslator {
    readonly providerName = "bedrock";
    readonly defaultModel = "anthropic.claude-3-haiku-20240307-v1:0";
    private client;
    constructor(config: ProviderConfig);
    /**
     * Get or create the Bedrock runtime client.
     *
     * When explicit credentials are not provided, the AWS SDK's default
     * credential provider chain is used (env vars, shared config, IAM roles /
     * OIDC, etc.).
     */
    private getClient;
    /**
     * Validate configuration
     */
    validateConfig(): void;
    /**
     * Check if the Bedrock API is reachable with the configured model.
     */
    checkAvailability(): Promise<boolean>;
    /**
     * Translate a batch of units
     */
    translate(request: TranslationRequest): Promise<TranslationResponse>;
    /**
     * Handle AWS Bedrock errors and convert them to appropriate error types.
     */
    private handleApiError;
}
//# sourceMappingURL=bedrock.d.ts.map