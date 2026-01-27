/**
 * Base error class for i18n-translate-action
 */
export class I18nTranslateError extends Error {
  public readonly code: string;
  public override readonly cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'I18nTranslateError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Configuration-related errors
 */
export class ConfigError extends I18nTranslateError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', cause);
    this.name = 'ConfigError';
  }
}

/**
 * File format parsing errors
 */
export class ExtractorError extends I18nTranslateError {
  public readonly filePath: string;

  constructor(message: string, filePath: string, cause?: Error) {
    super(message, 'EXTRACTOR_ERROR', cause);
    this.name = 'ExtractorError';
    this.filePath = filePath;
  }
}

/**
 * Translation provider errors
 */
export class TranslatorError extends I18nTranslateError {
  public readonly provider: string;
  public readonly isRetryable: boolean;

  constructor(message: string, provider: string, isRetryable = false, cause?: Error) {
    super(message, 'TRANSLATOR_ERROR', cause);
    this.name = 'TranslatorError';
    this.provider = provider;
    this.isRetryable = isRetryable;
  }
}

/**
 * Rate limit exceeded errors
 */
export class RateLimitError extends TranslatorError {
  public readonly retryAfter?: number;

  constructor(provider: string, retryAfter?: number, cause?: Error) {
    super(`Rate limit exceeded for provider: ${provider}`, provider, true, cause);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * API authentication errors
 */
export class AuthenticationError extends TranslatorError {
  constructor(provider: string, cause?: Error) {
    super(`Authentication failed for provider: ${provider}`, provider, false, cause);
    this.name = 'AuthenticationError';
  }
}

/**
 * ICU message parsing errors
 */
export class ICUParseError extends I18nTranslateError {
  public readonly source: string;
  public readonly position?: number;

  constructor(message: string, source: string, position?: number, cause?: Error) {
    super(message, 'ICU_PARSE_ERROR', cause);
    this.name = 'ICUParseError';
    this.source = source;
    this.position = position;
  }
}

/**
 * Output formatting errors
 */
export class FormatterError extends I18nTranslateError {
  public readonly format: string;

  constructor(message: string, format: string, cause?: Error) {
    super(message, 'FORMATTER_ERROR', cause);
    this.name = 'FormatterError';
    this.format = format;
  }
}

/**
 * Git operation errors
 */
export class GitError extends I18nTranslateError {
  public readonly operation: string;

  constructor(message: string, operation: string, cause?: Error) {
    super(message, 'GIT_ERROR', cause);
    this.name = 'GitError';
    this.operation = operation;
  }
}

/**
 * Validation error details
 */
export interface ValidationIssue {
  path: string[];
  message: string;
}

/**
 * Schema validation errors
 */
export class ValidationError extends I18nTranslateError {
  public readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.issues = issues;
  }

  public formatIssues(): string {
    return this.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  }
}
