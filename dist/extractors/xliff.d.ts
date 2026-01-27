import type { ExtractResult, FormatInfo } from '../types/translation';
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
    extract(filePath: string, content: string, targetLanguage: string, options?: ExtractOptions): Promise<ExtractResult>;
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
    /**
     * Extract text content from element (handles mixed content)
     */
    private extractTextContent;
    /**
     * Create hash of content for change detection
     */
    private hashContent;
}
//# sourceMappingURL=xliff.d.ts.map