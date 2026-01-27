import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { ConfigError, ValidationError, ValidationIssue } from '../utils/errors';
import { logger } from '../utils/logger';
import { actionConfigSchema, configFileSchema, isValidFileFormat, isValidProvider } from './schema';
import type {
  ActionConfig,
  ActionInputs,
  ConfigFile,
  FileFormat,
  Provider,
  ProviderConfig,
} from './types';
import { DEFAULT_CONFIG } from './types';

/**
 * Parse YAML content (simple implementation for basic structure)
 * For production, consider using a proper YAML parser like js-yaml
 */
function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [
    { obj: result, indent: -1 },
  ];

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }

    const indent = line.search(/\S/);
    const trimmedLine = line.trim();

    // Handle array items
    if (trimmedLine.startsWith('- ')) {
      const value = trimmedLine.slice(2).trim();
      const current = stack[stack.length - 1];
      if (current) {
        const keys = Object.keys(current.obj);
        const lastKey = keys[keys.length - 1];
        if (lastKey !== undefined) {
          const lastValue = current.obj[lastKey];
          if (Array.isArray(lastValue)) {
            lastValue.push(parseValue(value));
          }
        }
      }
      continue;
    }

    // Handle key-value pairs
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, colonIndex).trim();
    const valueStr = trimmedLine.slice(colonIndex + 1).trim();

    // Pop stack until we find the right parent
    while (stack.length > 1 && (stack[stack.length - 1]?.indent ?? 0) >= indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];
    if (!current) {
      continue;
    }

    if (valueStr === '') {
      // This is a nested object or array
      const nextLine = lines[lines.indexOf(line) + 1];
      if (nextLine?.trim().startsWith('- ')) {
        current.obj[key] = [];
      } else {
        const newObj: Record<string, unknown> = {};
        current.obj[key] = newObj;
        stack.push({ obj: newObj, indent });
      }
    } else {
      current.obj[key] = parseValue(valueStr);
    }
  }

  return result;
}

/**
 * Parse a YAML value to its appropriate type
 */
function parseValue(value: string): unknown {
  // Handle quoted strings
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Handle booleans
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }

  // Handle null
  if (value === 'null' || value === '~') {
    return null;
  }

  // Handle numbers
  const num = Number(value);
  if (!isNaN(num) && value !== '') {
    return num;
  }

  return value;
}

/**
 * Load configuration from file
 */
export function loadConfigFile(configPath: string): ConfigFile | null {
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    logger.debug(`Config file not found at ${absolutePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = parseYaml(content);
    const validated = configFileSchema.parse(parsed);
    logger.info(`Loaded configuration from ${configPath}`);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues: ValidationIssue[] = error.errors.map(e => ({
        path: e.path.map(String),
        message: e.message,
      }));
      throw new ValidationError(`Invalid configuration file: ${configPath}`, issues);
    }
    throw new ConfigError(
      `Failed to parse configuration file: ${configPath}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get action inputs from GitHub Actions environment
 */
export function getActionInputs(): ActionInputs {
  return {
    provider: core.getInput('provider', { required: true }),
    apiKey: core.getInput('api-key') || undefined,
    model: core.getInput('model') || undefined,
    sourceLanguage: core.getInput('source-language', { required: true }),
    targetLanguages: core.getInput('target-languages', { required: true }),
    files: core.getInput('files', { required: true }),
    format: core.getInput('format') || 'auto',
    configFile: core.getInput('config-file') || '.i18n-translate.yml',
    commit: core.getInput('commit') || 'true',
    commitMessage: core.getInput('commit-message') || DEFAULT_CONFIG.git.commitMessage,
    batchSize: core.getInput('batch-size') || String(DEFAULT_CONFIG.translation.batchSize),
    maxRetries: core.getInput('max-retries') || String(DEFAULT_CONFIG.translation.maxRetries),
    ollamaUrl: core.getInput('ollama-url') || undefined,
    dryRun: core.getInput('dry-run') || 'false',
    context: core.getInput('context') || undefined,
  };
}

/**
 * Build provider configuration from inputs
 */
function buildProviderConfig(inputs: ActionInputs, fileConfig: ConfigFile | null): ProviderConfig {
  const providerName = fileConfig?.provider?.name ?? inputs.provider;

  if (!isValidProvider(providerName)) {
    throw new ConfigError(`Invalid provider: ${providerName}`);
  }

  const provider = providerName as Provider;

  const config: ProviderConfig = {
    provider,
    model: inputs.model ?? fileConfig?.provider?.model,
    maxTokens: fileConfig?.provider?.maxTokens ?? DEFAULT_CONFIG.provider.maxTokens,
    temperature: fileConfig?.provider?.temperature ?? DEFAULT_CONFIG.provider.temperature,
  };

  // Handle provider-specific requirements
  switch (provider) {
    case 'anthropic':
    case 'openai':
      config.apiKey = inputs.apiKey;
      if (!config.apiKey) {
        throw new ConfigError(`API key is required for ${provider} provider`);
      }
      break;
    case 'ollama':
      config.baseUrl =
        inputs.ollamaUrl ?? fileConfig?.provider?.baseUrl ?? 'http://localhost:11434';
      if (!inputs.model && !fileConfig?.provider?.model) {
        throw new ConfigError('Model is required for Ollama provider');
      }
      break;
  }

  return config;
}

/**
 * Merge configuration sources and validate
 */
export function loadConfig(inputs?: ActionInputs): ActionConfig {
  // Get inputs from GitHub Actions if not provided
  const actionInputs = inputs ?? getActionInputs();

  // Load config file if it exists
  const fileConfig = loadConfigFile(actionInputs.configFile);

  // Parse target languages
  const targetLanguages = actionInputs.targetLanguages
    .split(',')
    .map(lang => lang.trim())
    .filter(lang => lang.length > 0);

  if (targetLanguages.length === 0) {
    throw new ConfigError('At least one target language is required');
  }

  // Parse file format
  const formatInput = actionInputs.format || fileConfig?.files?.format || 'auto';
  if (!isValidFileFormat(formatInput)) {
    throw new ConfigError(`Invalid file format: ${formatInput}`);
  }
  const format = formatInput as FileFormat;

  // Build configuration object
  const configInput = {
    provider: buildProviderConfig(actionInputs, fileConfig),
    translation: {
      batchSize:
        parseInt(actionInputs.batchSize, 10) ||
        fileConfig?.translation?.batchSize ||
        DEFAULT_CONFIG.translation.batchSize,
      maxRetries:
        parseInt(actionInputs.maxRetries, 10) ||
        fileConfig?.translation?.maxRetries ||
        DEFAULT_CONFIG.translation.maxRetries,
      retryDelayMs:
        fileConfig?.translation?.retryDelayMs ?? DEFAULT_CONFIG.translation.retryDelayMs,
      rateLimitPerMinute: fileConfig?.translation?.rateLimitPerMinute,
      context: actionInputs.context ?? fileConfig?.translation?.context,
      preserveFormatting:
        fileConfig?.translation?.preserveFormatting ??
        DEFAULT_CONFIG.translation.preserveFormatting,
      preservePlaceholders:
        fileConfig?.translation?.preservePlaceholders ??
        DEFAULT_CONFIG.translation.preservePlaceholders,
    },
    git: {
      enabled:
        actionInputs.commit === 'true' && (fileConfig?.git?.enabled ?? DEFAULT_CONFIG.git.enabled),
      commitMessage:
        actionInputs.commitMessage ||
        fileConfig?.git?.commitMessage ||
        DEFAULT_CONFIG.git.commitMessage,
      branch: fileConfig?.git?.branch,
      userName: fileConfig?.git?.userName,
      userEmail: fileConfig?.git?.userEmail,
    },
    files: {
      pattern: actionInputs.files || fileConfig?.files?.pattern || '**/*.xliff',
      format,
      sourceLanguage:
        actionInputs.sourceLanguage ||
        fileConfig?.files?.sourceLanguage ||
        DEFAULT_CONFIG.files.sourceLanguage ||
        'en',
      targetLanguages:
        targetLanguages.length > 0 ? targetLanguages : (fileConfig?.files?.targetLanguages ?? []),
      exclude: fileConfig?.files?.exclude,
    },
    dryRun: actionInputs.dryRun === 'true' || (fileConfig?.dryRun ?? DEFAULT_CONFIG.dryRun),
  };

  // Validate complete configuration
  try {
    const validated = actionConfigSchema.parse(configInput);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues: ValidationIssue[] = error.errors.map(e => ({
        path: e.path.map(String),
        message: e.message,
      }));
      throw new ValidationError('Invalid configuration', issues);
    }
    throw error;
  }
}
