/**
 * Supported LLM providers
 */
export type Provider = 'anthropic' | 'openai' | 'ollama' | 'bedrock';

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
  /** AWS region (bedrock provider) */
  region?: string;
  /** AWS access key ID (bedrock provider — falls back to the default credential chain when omitted) */
  accessKeyId?: string;
  /** AWS secret access key (bedrock provider) */
  secretAccessKey?: string;
  /** AWS session token for temporary credentials (bedrock provider) */
  sessionToken?: string;
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
 * AWS Bedrock-specific configuration
 *
 * Credentials are optional: when omitted, the AWS SDK's default credential
 * provider chain is used (env vars, shared config, IAM roles / OIDC, etc.).
 */
export interface BedrockConfig extends ProviderConfig {
  provider: 'bedrock';
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
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
  glossaryFile?: string;
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
export const DEFAULT_CONFIG: Omit<ActionConfig, 'provider' | 'files'> & {
  provider: Partial<ProviderConfig>;
  files: Partial<FilesConfig>;
} = {
  provider: {
    maxTokens: 4096,
    temperature: 0.3,
  },
  translation: {
    batchSize: 10,
    maxRetries: 3,
    retryDelayMs: 1000,
    preserveFormatting: true,
    preservePlaceholders: true,
  },
  git: {
    enabled: true,
    commitMessage: 'chore(i18n): update translations',
  },
  files: {
    format: 'auto',
    sourceLanguage: 'en',
  },
  dryRun: false,
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
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  dryRun: string;
  context?: string;
  glossaryFile?: string;
}

/**
 * Configuration file structure (.i18n-translate.yml)
 */
export interface ConfigFile {
  provider?: {
    name?: Provider;
    model?: string;
    baseUrl?: string;
    region?: string;
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
    glossaryFile?: string;
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
