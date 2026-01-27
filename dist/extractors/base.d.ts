import type { ExtractResult, FormatInfo } from '../types/translation';
/**
 * Options for extraction
 */
export interface ExtractOptions {
    preserveWhitespace?: boolean;
    includeNotes?: boolean;
    includeContext?: boolean;
}
/**
 * Base extractor interface for parsing translation files
 */
export declare abstract class BaseExtractor {
    /**
     * The format(s) this extractor supports
     */
    abstract readonly supportedFormats: FormatInfo['format'][];
    /**
     * File extensions this extractor handles
     */
    abstract readonly fileExtensions: string[];
    /**
     * Extract translation units from a file
     * @param filePath Path to the file
     * @param content File content
     * @param targetLanguage Target language code
     * @param options Extraction options
     */
    abstract extract(filePath: string, content: string, targetLanguage: string, options?: ExtractOptions): Promise<ExtractResult>;
    /**
     * Detect if content matches this extractor's format
     * @param content File content to analyze
     */
    abstract detect(content: string): FormatInfo | null;
    /**
     * Check if this extractor supports a given file extension
     */
    supportsExtension(extension: string): boolean;
    /**
     * Check if this extractor supports a given format
     */
    supportsFormat(format: FormatInfo['format']): boolean;
    /**
     * Validate that content is parseable by this extractor
     * @param content File content to validate
     * @returns true if valid, throws if invalid
     */
    abstract validate(content: string): boolean;
}
/**
 * Registry of available extractors
 */
export declare class ExtractorRegistry {
    private extractors;
    /**
     * Register an extractor
     */
    register(extractor: BaseExtractor): void;
    /**
     * Get an extractor for a given format
     */
    getByFormat(format: FormatInfo['format']): BaseExtractor | undefined;
    /**
     * Get an extractor for a given file extension
     */
    getByExtension(extension: string): BaseExtractor | undefined;
    /**
     * Detect format and get appropriate extractor
     */
    detect(content: string): {
        extractor: BaseExtractor;
        formatInfo: FormatInfo;
    } | undefined;
    /**
     * Get all registered extractors
     */
    getAll(): BaseExtractor[];
}
//# sourceMappingURL=base.d.ts.map