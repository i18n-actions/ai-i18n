import { z } from 'zod';
import type { FileFormat, Provider } from './types';
/**
 * Provider enum schema
 */
export declare const providerSchema: z.ZodEnum<["anthropic", "openai", "ollama"]>;
/**
 * File format enum schema
 */
export declare const fileFormatSchema: z.ZodEnum<["xliff-1.2", "xliff-2.0", "json-flat", "json-nested", "auto"]>;
/**
 * Language code schema (BCP-47 format)
 */
export declare const languageCodeSchema: z.ZodString;
/**
 * Provider configuration schema
 */
export declare const providerConfigSchema: z.ZodEffects<z.ZodObject<{
    provider: z.ZodEnum<["anthropic", "openai", "ollama"]>;
    apiKey: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    temperature: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    provider: "anthropic" | "openai" | "ollama";
    model?: string | undefined;
    baseUrl?: string | undefined;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    apiKey?: string | undefined;
}, {
    provider: "anthropic" | "openai" | "ollama";
    model?: string | undefined;
    baseUrl?: string | undefined;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    apiKey?: string | undefined;
}>, {
    provider: "anthropic" | "openai" | "ollama";
    model?: string | undefined;
    baseUrl?: string | undefined;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    apiKey?: string | undefined;
}, {
    provider: "anthropic" | "openai" | "ollama";
    model?: string | undefined;
    baseUrl?: string | undefined;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    apiKey?: string | undefined;
}>;
/**
 * Translation configuration schema
 */
export declare const translationConfigSchema: z.ZodObject<{
    batchSize: z.ZodDefault<z.ZodNumber>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    retryDelayMs: z.ZodDefault<z.ZodNumber>;
    rateLimitPerMinute: z.ZodOptional<z.ZodNumber>;
    context: z.ZodOptional<z.ZodString>;
    preserveFormatting: z.ZodDefault<z.ZodBoolean>;
    preservePlaceholders: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    batchSize: number;
    maxRetries: number;
    retryDelayMs: number;
    preserveFormatting: boolean;
    preservePlaceholders: boolean;
    rateLimitPerMinute?: number | undefined;
    context?: string | undefined;
}, {
    batchSize?: number | undefined;
    rateLimitPerMinute?: number | undefined;
    maxRetries?: number | undefined;
    retryDelayMs?: number | undefined;
    context?: string | undefined;
    preserveFormatting?: boolean | undefined;
    preservePlaceholders?: boolean | undefined;
}>;
/**
 * Git configuration schema
 */
export declare const gitConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    commitMessage: z.ZodDefault<z.ZodString>;
    branch: z.ZodOptional<z.ZodString>;
    userName: z.ZodOptional<z.ZodString>;
    userEmail: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    commitMessage: string;
    branch?: string | undefined;
    userName?: string | undefined;
    userEmail?: string | undefined;
}, {
    enabled?: boolean | undefined;
    commitMessage?: string | undefined;
    branch?: string | undefined;
    userName?: string | undefined;
    userEmail?: string | undefined;
}>;
/**
 * Files configuration schema
 */
export declare const filesConfigSchema: z.ZodObject<{
    pattern: z.ZodString;
    format: z.ZodDefault<z.ZodEnum<["xliff-1.2", "xliff-2.0", "json-flat", "json-nested", "auto"]>>;
    sourceLanguage: z.ZodDefault<z.ZodString>;
    targetLanguages: z.ZodArray<z.ZodString, "many">;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    pattern: string;
    format: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto";
    sourceLanguage: string;
    targetLanguages: string[];
    exclude?: string[] | undefined;
}, {
    pattern: string;
    targetLanguages: string[];
    exclude?: string[] | undefined;
    format?: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto" | undefined;
    sourceLanguage?: string | undefined;
}>;
/**
 * Complete action configuration schema
 */
export declare const actionConfigSchema: z.ZodObject<{
    provider: z.ZodEffects<z.ZodObject<{
        provider: z.ZodEnum<["anthropic", "openai", "ollama"]>;
        apiKey: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        baseUrl: z.ZodOptional<z.ZodString>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        temperature: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider: "anthropic" | "openai" | "ollama";
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        apiKey?: string | undefined;
    }, {
        provider: "anthropic" | "openai" | "ollama";
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        apiKey?: string | undefined;
    }>, {
        provider: "anthropic" | "openai" | "ollama";
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        apiKey?: string | undefined;
    }, {
        provider: "anthropic" | "openai" | "ollama";
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        apiKey?: string | undefined;
    }>;
    translation: z.ZodObject<{
        batchSize: z.ZodDefault<z.ZodNumber>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
        retryDelayMs: z.ZodDefault<z.ZodNumber>;
        rateLimitPerMinute: z.ZodOptional<z.ZodNumber>;
        context: z.ZodOptional<z.ZodString>;
        preserveFormatting: z.ZodDefault<z.ZodBoolean>;
        preservePlaceholders: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        batchSize: number;
        maxRetries: number;
        retryDelayMs: number;
        preserveFormatting: boolean;
        preservePlaceholders: boolean;
        rateLimitPerMinute?: number | undefined;
        context?: string | undefined;
    }, {
        batchSize?: number | undefined;
        rateLimitPerMinute?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
        context?: string | undefined;
        preserveFormatting?: boolean | undefined;
        preservePlaceholders?: boolean | undefined;
    }>;
    git: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        commitMessage: z.ZodDefault<z.ZodString>;
        branch: z.ZodOptional<z.ZodString>;
        userName: z.ZodOptional<z.ZodString>;
        userEmail: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        commitMessage: string;
        branch?: string | undefined;
        userName?: string | undefined;
        userEmail?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        commitMessage?: string | undefined;
        branch?: string | undefined;
        userName?: string | undefined;
        userEmail?: string | undefined;
    }>;
    files: z.ZodObject<{
        pattern: z.ZodString;
        format: z.ZodDefault<z.ZodEnum<["xliff-1.2", "xliff-2.0", "json-flat", "json-nested", "auto"]>>;
        sourceLanguage: z.ZodDefault<z.ZodString>;
        targetLanguages: z.ZodArray<z.ZodString, "many">;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        pattern: string;
        format: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto";
        sourceLanguage: string;
        targetLanguages: string[];
        exclude?: string[] | undefined;
    }, {
        pattern: string;
        targetLanguages: string[];
        exclude?: string[] | undefined;
        format?: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto" | undefined;
        sourceLanguage?: string | undefined;
    }>;
    dryRun: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    provider: {
        provider: "anthropic" | "openai" | "ollama";
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        apiKey?: string | undefined;
    };
    translation: {
        batchSize: number;
        maxRetries: number;
        retryDelayMs: number;
        preserveFormatting: boolean;
        preservePlaceholders: boolean;
        rateLimitPerMinute?: number | undefined;
        context?: string | undefined;
    };
    git: {
        enabled: boolean;
        commitMessage: string;
        branch?: string | undefined;
        userName?: string | undefined;
        userEmail?: string | undefined;
    };
    files: {
        pattern: string;
        format: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto";
        sourceLanguage: string;
        targetLanguages: string[];
        exclude?: string[] | undefined;
    };
    dryRun: boolean;
}, {
    provider: {
        provider: "anthropic" | "openai" | "ollama";
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        apiKey?: string | undefined;
    };
    translation: {
        batchSize?: number | undefined;
        rateLimitPerMinute?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
        context?: string | undefined;
        preserveFormatting?: boolean | undefined;
        preservePlaceholders?: boolean | undefined;
    };
    git: {
        enabled?: boolean | undefined;
        commitMessage?: string | undefined;
        branch?: string | undefined;
        userName?: string | undefined;
        userEmail?: string | undefined;
    };
    files: {
        pattern: string;
        targetLanguages: string[];
        exclude?: string[] | undefined;
        format?: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto" | undefined;
        sourceLanguage?: string | undefined;
    };
    dryRun?: boolean | undefined;
}>;
/**
 * Configuration file schema (.i18n-translate.yml)
 */
export declare const configFileSchema: z.ZodObject<{
    provider: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodEnum<["anthropic", "openai", "ollama"]>>;
        model: z.ZodOptional<z.ZodString>;
        baseUrl: z.ZodOptional<z.ZodString>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        temperature: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name?: "anthropic" | "openai" | "ollama" | undefined;
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
    }, {
        name?: "anthropic" | "openai" | "ollama" | undefined;
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
    }>>;
    translation: z.ZodOptional<z.ZodObject<{
        batchSize: z.ZodOptional<z.ZodNumber>;
        maxRetries: z.ZodOptional<z.ZodNumber>;
        retryDelayMs: z.ZodOptional<z.ZodNumber>;
        rateLimitPerMinute: z.ZodOptional<z.ZodNumber>;
        context: z.ZodOptional<z.ZodString>;
        preserveFormatting: z.ZodOptional<z.ZodBoolean>;
        preservePlaceholders: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        batchSize?: number | undefined;
        rateLimitPerMinute?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
        context?: string | undefined;
        preserveFormatting?: boolean | undefined;
        preservePlaceholders?: boolean | undefined;
    }, {
        batchSize?: number | undefined;
        rateLimitPerMinute?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
        context?: string | undefined;
        preserveFormatting?: boolean | undefined;
        preservePlaceholders?: boolean | undefined;
    }>>;
    git: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        commitMessage: z.ZodOptional<z.ZodString>;
        branch: z.ZodOptional<z.ZodString>;
        userName: z.ZodOptional<z.ZodString>;
        userEmail: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        commitMessage?: string | undefined;
        branch?: string | undefined;
        userName?: string | undefined;
        userEmail?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        commitMessage?: string | undefined;
        branch?: string | undefined;
        userName?: string | undefined;
        userEmail?: string | undefined;
    }>>;
    files: z.ZodOptional<z.ZodObject<{
        pattern: z.ZodOptional<z.ZodString>;
        format: z.ZodOptional<z.ZodEnum<["xliff-1.2", "xliff-2.0", "json-flat", "json-nested", "auto"]>>;
        sourceLanguage: z.ZodOptional<z.ZodString>;
        targetLanguages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        exclude?: string[] | undefined;
        pattern?: string | undefined;
        format?: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto" | undefined;
        sourceLanguage?: string | undefined;
        targetLanguages?: string[] | undefined;
    }, {
        exclude?: string[] | undefined;
        pattern?: string | undefined;
        format?: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto" | undefined;
        sourceLanguage?: string | undefined;
        targetLanguages?: string[] | undefined;
    }>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    provider?: {
        name?: "anthropic" | "openai" | "ollama" | undefined;
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
    } | undefined;
    translation?: {
        batchSize?: number | undefined;
        rateLimitPerMinute?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
        context?: string | undefined;
        preserveFormatting?: boolean | undefined;
        preservePlaceholders?: boolean | undefined;
    } | undefined;
    git?: {
        enabled?: boolean | undefined;
        commitMessage?: string | undefined;
        branch?: string | undefined;
        userName?: string | undefined;
        userEmail?: string | undefined;
    } | undefined;
    files?: {
        exclude?: string[] | undefined;
        pattern?: string | undefined;
        format?: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto" | undefined;
        sourceLanguage?: string | undefined;
        targetLanguages?: string[] | undefined;
    } | undefined;
    dryRun?: boolean | undefined;
}, {
    provider?: {
        name?: "anthropic" | "openai" | "ollama" | undefined;
        model?: string | undefined;
        baseUrl?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
    } | undefined;
    translation?: {
        batchSize?: number | undefined;
        rateLimitPerMinute?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
        context?: string | undefined;
        preserveFormatting?: boolean | undefined;
        preservePlaceholders?: boolean | undefined;
    } | undefined;
    git?: {
        enabled?: boolean | undefined;
        commitMessage?: string | undefined;
        branch?: string | undefined;
        userName?: string | undefined;
        userEmail?: string | undefined;
    } | undefined;
    files?: {
        exclude?: string[] | undefined;
        pattern?: string | undefined;
        format?: "xliff-1.2" | "xliff-2.0" | "json-flat" | "json-nested" | "auto" | undefined;
        sourceLanguage?: string | undefined;
        targetLanguages?: string[] | undefined;
    } | undefined;
    dryRun?: boolean | undefined;
}>;
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
export declare function isValidProvider(value: string): value is Provider;
/**
 * Validate file format type
 */
export declare function isValidFileFormat(value: string): value is FileFormat;
//# sourceMappingURL=schema.d.ts.map