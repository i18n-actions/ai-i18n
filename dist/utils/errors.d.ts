/**
 * Base error class for i18n-translate-action
 */
export declare class I18nTranslateError extends Error {
    readonly code: string;
    readonly cause?: Error;
    constructor(message: string, code: string, cause?: Error);
}
/**
 * Configuration-related errors
 */
export declare class ConfigError extends I18nTranslateError {
    constructor(message: string, cause?: Error);
}
/**
 * File format parsing errors
 */
export declare class ExtractorError extends I18nTranslateError {
    readonly filePath: string;
    constructor(message: string, filePath: string, cause?: Error);
}
/**
 * Translation provider errors
 */
export declare class TranslatorError extends I18nTranslateError {
    readonly provider: string;
    readonly isRetryable: boolean;
    constructor(message: string, provider: string, isRetryable?: boolean, cause?: Error);
}
/**
 * Rate limit exceeded errors
 */
export declare class RateLimitError extends TranslatorError {
    readonly retryAfter?: number;
    constructor(provider: string, retryAfter?: number, cause?: Error);
}
/**
 * API authentication errors
 */
export declare class AuthenticationError extends TranslatorError {
    constructor(provider: string, cause?: Error);
}
/**
 * ICU message parsing errors
 */
export declare class ICUParseError extends I18nTranslateError {
    readonly source: string;
    readonly position?: number;
    constructor(message: string, source: string, position?: number, cause?: Error);
}
/**
 * Output formatting errors
 */
export declare class FormatterError extends I18nTranslateError {
    readonly format: string;
    constructor(message: string, format: string, cause?: Error);
}
/**
 * Git operation errors
 */
export declare class GitError extends I18nTranslateError {
    readonly operation: string;
    constructor(message: string, operation: string, cause?: Error);
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
export declare class ValidationError extends I18nTranslateError {
    readonly issues: ValidationIssue[];
    constructor(message: string, issues: ValidationIssue[]);
    formatIssues(): string;
}
//# sourceMappingURL=errors.d.ts.map