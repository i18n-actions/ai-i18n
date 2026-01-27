import { z } from 'zod';
import type { FileFormat, Provider } from './types';

/**
 * Provider enum schema
 */
export const providerSchema = z.enum(['anthropic', 'openai', 'ollama']);

/**
 * File format enum schema
 */
export const fileFormatSchema = z.enum([
  'xliff-1.2',
  'xliff-2.0',
  'json-flat',
  'json-nested',
  'auto',
]);

/**
 * Language code schema (BCP-47 format)
 */
export const languageCodeSchema = z
  .string()
  .min(2)
  .max(10)
  .regex(/^[a-z]{2,3}(-[A-Z]{2,3})?(-[a-z]{4})?$/i, 'Invalid language code format');

/**
 * Provider configuration schema
 */
export const providerConfigSchema = z
  .object({
    provider: providerSchema,
    apiKey: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    baseUrl: z.string().url().optional(),
    maxTokens: z.number().int().positive().max(100000).optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .refine(
    data => {
      // API key required for anthropic and openai
      if ((data.provider === 'anthropic' || data.provider === 'openai') && !data.apiKey) {
        return false;
      }
      // Base URL required for ollama
      if (data.provider === 'ollama' && !data.baseUrl) {
        return false;
      }
      return true;
    },
    {
      message:
        'API key is required for anthropic and openai providers. Base URL is required for ollama.',
    }
  );

/**
 * Translation configuration schema
 */
export const translationConfigSchema = z.object({
  batchSize: z.number().int().positive().max(100).default(10),
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryDelayMs: z.number().int().positive().max(60000).default(1000),
  rateLimitPerMinute: z.number().int().positive().optional(),
  context: z.string().max(2000).optional(),
  preserveFormatting: z.boolean().default(true),
  preservePlaceholders: z.boolean().default(true),
});

/**
 * Git configuration schema
 */
export const gitConfigSchema = z.object({
  enabled: z.boolean().default(true),
  commitMessage: z.string().min(1).max(500).default('chore(i18n): update translations'),
  branch: z.string().min(1).max(255).optional(),
  userName: z.string().min(1).max(100).optional(),
  userEmail: z.string().email().optional(),
});

/**
 * Files configuration schema
 */
export const filesConfigSchema = z.object({
  pattern: z.string().min(1),
  format: fileFormatSchema.default('auto'),
  sourceLanguage: languageCodeSchema.default('en'),
  targetLanguages: z.array(languageCodeSchema).min(1),
  exclude: z.array(z.string()).optional(),
});

/**
 * Complete action configuration schema
 */
export const actionConfigSchema = z.object({
  provider: providerConfigSchema,
  translation: translationConfigSchema,
  git: gitConfigSchema,
  files: filesConfigSchema,
  dryRun: z.boolean().default(false),
});

/**
 * Configuration file schema (.i18n-translate.yml)
 */
export const configFileSchema = z.object({
  provider: z
    .object({
      name: providerSchema.optional(),
      model: z.string().min(1).optional(),
      baseUrl: z.string().url().optional(),
      maxTokens: z.number().int().positive().max(100000).optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
  translation: z
    .object({
      batchSize: z.number().int().positive().max(100).optional(),
      maxRetries: z.number().int().min(0).max(10).optional(),
      retryDelayMs: z.number().int().positive().max(60000).optional(),
      rateLimitPerMinute: z.number().int().positive().optional(),
      context: z.string().max(2000).optional(),
      preserveFormatting: z.boolean().optional(),
      preservePlaceholders: z.boolean().optional(),
    })
    .optional(),
  git: z
    .object({
      enabled: z.boolean().optional(),
      commitMessage: z.string().min(1).max(500).optional(),
      branch: z.string().min(1).max(255).optional(),
      userName: z.string().min(1).max(100).optional(),
      userEmail: z.string().email().optional(),
    })
    .optional(),
  files: z
    .object({
      pattern: z.string().min(1).optional(),
      format: fileFormatSchema.optional(),
      sourceLanguage: languageCodeSchema.optional(),
      targetLanguages: z.array(languageCodeSchema).optional(),
      exclude: z.array(z.string()).optional(),
    })
    .optional(),
  dryRun: z.boolean().optional(),
});

/**
 * Type inference helpers
 */
export type ProviderConfigInput = z.input<typeof providerConfigSchema>;
export type TranslationConfigInput = z.input<typeof translationConfigSchema>;
export type GitConfigInput = z.input<typeof gitConfigSchema>;
export type FilesConfigInput = z.input<typeof filesConfigSchema>;
export type ActionConfigInput = z.input<typeof actionConfigSchema>;
export type ConfigFileInput = z.input<typeof configFileSchema>;

/**
 * Validate provider type
 */
export function isValidProvider(value: string): value is Provider {
  return ['anthropic', 'openai', 'ollama'].includes(value);
}

/**
 * Validate file format type
 */
export function isValidFileFormat(value: string): value is FileFormat {
  return ['xliff-1.2', 'xliff-2.0', 'json-flat', 'json-nested', 'auto'].includes(value);
}
