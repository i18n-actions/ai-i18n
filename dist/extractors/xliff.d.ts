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
     * Ordered parser preserves element position relative to text nodes.
     * Required for correct extraction of inline elements like <x id="PH"/>
     * interspersed with text content.
     */
    private orderedParser;
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
     * Extract text content from element (plain text, no placeholder tracking).
     * Used for notes, context, and other non-inline-element fields.
     */
    private extractTextContent;
    /**
     * Build a map from unit ID to ordered (preserveOrder: true) children of source/target.
     * This preserves the position of inline XML elements relative to text nodes.
     */
    private buildOrderedSourceMap;
    /**
     * Get an attribute from a preserveOrder node's ':@' entry.
     */
    private getOrderedAttr;
    /**
     * Find the children array of a named element within a preserveOrder children array.
     */
    private getOrderedElementChildren;
    /**
     * Walk ordered (preserveOrder: true) children and extract text with {{marker}} placeholders.
     * Correctly preserves the position of inline elements relative to text.
     */
    private extractOrderedContent;
    /**
     * Extract text content and placeholders from ordered children.
     * Returns both the text (with placeholder markers) and the placeholder array.
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