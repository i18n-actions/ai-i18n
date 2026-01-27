// Configuration
export * from './config/types';
export * from './config/schema';
export { loadConfig, loadConfigFile, getActionInputs } from './config/loader';

// Types
export * from './types/translation';

// Extractors
export { BaseExtractor, ExtractorRegistry, ExtractOptions } from './extractors/base';
export { XliffExtractor } from './extractors/xliff';
export { JsonExtractor, buildNestedJson, flattenJson } from './extractors/json';
export {
  createExtractorRegistry,
  getExtractor,
  extractFromFile,
  extractFromPattern,
  getSupportedExtensions,
  getSupportedFormats,
} from './extractors/factory';

// Differ
export * from './differ/hasher';
export * from './differ/differ';

// ICU
export * from './icu/types';
export * from './icu/parser';
export * from './icu/cldr-rules';
export * from './icu/reconstructor';

// Translators
export { BaseTranslator, parseLLMResponse, estimateTokenCount } from './translators/base';
export { AnthropicTranslator } from './translators/providers/anthropic';
export { OpenAITranslator } from './translators/providers/openai';
export { OllamaTranslator } from './translators/providers/ollama';
export {
  createTranslator,
  getDefaultModel,
  TranslationOrchestrator,
  createOrchestrator,
} from './translators/factory';
export * from './translators/batcher';
export * from './translators/rate-limiter';
export * from './translators/retry';
export * from './translators/context-builder';

// Formatters
export { BaseFormatter, FormatterRegistry, FormatOptions, mergeUnits, countChanges } from './formatters/base';
export { XliffFormatter } from './formatters/xliff';
export { JsonFormatter, createJsonFile, mergeJsonFiles } from './formatters/json';
export {
  createFormatterRegistry,
  getFormatter,
  getFormatterByExtension,
  formatTranslations,
  writeTranslations,
  createTranslationFile,
} from './formatters/factory';

// Git
export { GitClient, createGitClient, CommitResult } from './git/client';
export {
  CommitLoopDetector,
  createLoopDetector,
  shouldSkipFromEnv,
  addSkipMarker,
  hasSkipMarker,
} from './git/commit-detector';

// Reporter
export {
  ReportBuilder,
  publishToActions,
  formatDuration,
  createErrorEntry,
  getStatusEmoji,
  getReportSummary,
} from './reporter/reporter';
export {
  generateMarkdownReport,
  generateCompactSummary,
  generateChangesTable,
  generateBadges,
  generateJsonSummary,
} from './reporter/markdown';

// Utilities
export * from './utils/errors';
export { logger, createLogger, Logger, LogLevel } from './utils/logger';
