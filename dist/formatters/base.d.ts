import type { ExtractResult, FormatResult, TranslationUnit, FormatInfo } from '../types/translation';
/**
 * Options for formatting output
 */
export interface FormatOptions {
    /**
     * Whether to preserve original formatting/whitespace
     */
    preserveFormatting?: boolean;
    /**
     * Whether to add translator comments
     */
    addComments?: boolean;
    /**
     * Indentation string (default: 2 spaces)
     */
    indent?: string;
    /**
     * Mark translated units with a state
     */
    markAsTranslated?: boolean;
}
/**
 * Base formatter interface for writing translation files
 */
export declare abstract class BaseFormatter {
    /**
     * The format(s) this formatter supports
     */
    abstract readonly supportedFormats: FormatInfo['format'][];
    /**
     * File extensions this formatter produces
     */
    abstract readonly fileExtensions: string[];
    /**
     * Format translated units back into file content
     *
     * @param originalContent Original file content
     * @param updatedUnits Units with translations
     * @param extractResult Original extraction result (for structure reference)
     * @param options Formatting options
     */
    abstract format(originalContent: string, updatedUnits: TranslationUnit[], extractResult: ExtractResult, options?: FormatOptions): Promise<FormatResult>;
    /**
     * Check if this formatter supports a given format
     */
    supportsFormat(format: FormatInfo['format']): boolean;
    /**
     * Check if this formatter supports a given file extension
     */
    supportsExtension(extension: string): boolean;
}
/**
 * Registry of available formatters
 */
export declare class FormatterRegistry {
    private formatters;
    /**
     * Register a formatter
     */
    register(formatter: BaseFormatter): void;
    /**
     * Get a formatter for a given format
     */
    getByFormat(format: FormatInfo['format']): BaseFormatter | undefined;
    /**
     * Get a formatter for a given file extension
     */
    getByExtension(extension: string): BaseFormatter | undefined;
    /**
     * Get all registered formatters
     */
    getAll(): BaseFormatter[];
}
/**
 * Merge updated units with original units
 */
export declare function mergeUnits(originalUnits: TranslationUnit[], updatedUnits: TranslationUnit[]): TranslationUnit[];
/**
 * Count changes between original and updated units
 */
export declare function countChanges(originalUnits: TranslationUnit[], updatedUnits: TranslationUnit[]): {
    updated: number;
    unchanged: number;
};
//# sourceMappingURL=base.d.ts.map