import type { ExtractResult, FormatInfo, XliffPlaceholder } from '../types/translation';
import { BaseExtractor, ExtractOptions } from './base';
/**
 * Extractor for XLIFF 1.2 and 2.0 files
 */
export declare class XliffExtractor extends BaseExtractor {
    readonly supportedFormats: FormatInfo['format'][];
    readonly fileExtensions: string[];
    private parser;
    /**
     * Detect XLIFF version from content
     */
    detect(content: string): FormatInfo | null;
    /**
     * Validate XLIFF content
     */
    validate(content: string): boolean;
    /**
     * Extract translation units from XLIFF file
     */
    extract(filePath: string, content: string, targetLanguage: string, options?: ExtractOptions): ExtractResult;
    /**
     * Extract from XLIFF 1.2 format
     */
    private extractXliff1;
    /**
     * Extract from XLIFF 2.0 format
     */
    private extractXliff2;
    /**
     * Process XLIFF 2.0 unit elements
     */
    private processXliff2Units;
    /**
     * Normalize value to array
     */
    private normalizeArray;
    /** XLIFF inline element tag names that should be treated as placeholders */
    private static readonly PLACEHOLDER_TAGS;
    /**
     * Context object for extracting text with placeholders
     */
    private createPlaceholderContext;
    /**
     * Extract text content from element, preserving placeholders as markers
     * Returns the text with placeholder markers (e.g., {{PH}}, {{0}})
     */
    private extractTextContent;
    /**
     * Extract text and placeholders from element
     * Returns text with markers, and populates the placeholders array
     */
    private extractTextWithPlaceholders;
    /**
     * Extract a placeholder element and create its marker
     */
    private extractPlaceholder;
    /**
     * Extract text content and placeholders from a source/target element
     * Returns both the text (with placeholder markers) and the placeholder array
     */
    extractContentWithPlaceholders(element: unknown): {
        text: string;
        placeholders: XliffPlaceholder[];
    };
    /**
     * Create hash of content for change detection
     */
    private hashContent;
}
//# sourceMappingURL=xliff.d.ts.map