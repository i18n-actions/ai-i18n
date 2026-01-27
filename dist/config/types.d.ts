/**
 * Supported LLM providers
 */
export type Provider = 'anthropic' | 'openai' | 'ollama';
/**
 * Supported file formats
 */
export type FileFormat = 'xliff-1.2' | 'xliff-2.0' | 'json-flat' | 'json-nested' | 'auto';
/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
    provider: Provider;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
}
/**
 * Anthropic-specific configuration
 */
export interface AnthropicConfig extends ProviderConfig {
    provider: 'anthropic';
    apiKey: string;
    model?: string;
}
/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends ProviderConfig {
    provider: 'openai';
    apiKey: string;
    model?: string;
}
/**
 * Ollama-specific configuration
 */
export interface OllamaConfig extends ProviderConfig {
    provider: 'ollama';
    baseUrl: string;
    model: string;
}
/**
 * Translation behavior configuration
 */
export interface TranslationConfig {
    batchSize: number;
    maxRetries: number;
    retryDelayMs: number;
    rateLimitPerMinute?: number;
    context?: string;
    preserveFormatting: boolean;
    preservePlaceholders: boolean;
}
/**
 * Git operation configuration
 */
export interface GitConfig {
    enabled: boolean;
    commitMessage: string;
    branch?: string;
    userName?: string;
    userEmail?: string;
}
/**
 * File matching configuration
 */
export interface FilesConfig {
    pattern: string;
    format: FileFormat;
    sourceLanguage: string;
    targetLanguages: string[];
    exclude?: string[];
}
/**
 * Complete action configuration
 */
export interface ActionConfig {
    provider: ProviderConfig;
    translation: TranslationConfig;
    git: GitConfig;
    files: FilesConfig;
    dryRun: boolean;
}
/**
 * Default configuration values
 */
export declare const DEFAULT_CONFIG: Omit<ActionConfig, 'provider' | 'files'> & {
    provider: Partial<ProviderConfig>;
    files: Partial<FilesConfig>;
};
/**
 * Action inputs from GitHub Actions
 */
export interface ActionInputs {
    provider: string;
    apiKey?: string;
    model?: string;
    sourceLanguage: string;
    targetLanguages: string;
    files: string;
    format: string;
    configFile: string;
    commit: string;
    commitMessage: string;
    batchSize: string;
    maxRetries: string;
    ollamaUrl?: string;
    dryRun: string;
    context?: string;
}
/**
 * Configuration file structure (.i18n-translate.yml)
 */
export interface ConfigFile {
    provider?: {
        name?: Provider;
        model?: string;
        baseUrl?: string;
        maxTokens?: number;
        temperature?: number;
    };
    translation?: {
        batchSize?: number;
        maxRetries?: number;
        retryDelayMs?: number;
        rateLimitPerMinute?: number;
        context?: string;
        preserveFormatting?: boolean;
        preservePlaceholders?: boolean;
    };
    git?: {
        enabled?: boolean;
        commitMessage?: string;
        branch?: string;
        userName?: string;
        userEmail?: string;
    };
    files?: {
        pattern?: string;
        format?: FileFormat;
        sourceLanguage?: string;
        targetLanguages?: string[];
        exclude?: string[];
    };
    dryRun?: boolean;
}
//# sourceMappingURL=types.d.ts.map