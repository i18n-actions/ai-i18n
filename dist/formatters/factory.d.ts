import type { ExtractResult, FormatResult, TranslationUnit, FormatInfo } from '../types/translation';
import { BaseFormatter, FormatterRegistry, FormatOptions } from './base';
/**
 * Create and configure the formatter registry with all available formatters
 */
export declare function createFormatterRegistry(): FormatterRegistry;
/**
 * Get a formatter for a specific format
 */
export declare function getFormatter(format: FormatInfo['format']): BaseFormatter;
/**
 * Get a formatter by file extension
 */
export declare function getFormatterByExtension(extension: string): BaseFormatter | undefined;
/**
 * Format translated units and return the new content
 */
export declare function formatTranslations(originalContent: string, updatedUnits: TranslationUnit[], extractResult: ExtractResult, options?: FormatOptions): Promise<FormatResult>;
/**
 * Write formatted translations to a file
 */
export declare function writeTranslations(filePath: string, originalContent: string, updatedUnits: TranslationUnit[], extractResult: ExtractResult, options?: FormatOptions & {
    createBackup?: boolean;
}): Promise<FormatResult>;
/**
 * Create a new translation file from units
 */
export declare function createTranslationFile(filePath: string, units: TranslationUnit[], format: FormatInfo['format'], sourceLanguage: string, targetLanguage: string, options?: FormatOptions): Promise<void>;
/**
 * Get all supported formats
 */
export declare function getSupportedFormats(): FormatInfo['format'][];
//# sourceMappingURL=factory.d.ts.map