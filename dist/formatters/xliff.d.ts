import type { ExtractResult, FormatResult, TranslationUnit, FormatInfo } from '../types/translation';
import { BaseFormatter, FormatOptions } from './base';
/**
 * XLIFF formatter for 1.2 and 2.0 formats
 */
export declare class XliffFormatter extends BaseFormatter {
    readonly supportedFormats: FormatInfo['format'][];
    readonly fileExtensions: string[];
    private parser;
    private builder;
    /**
     * Format XLIFF content with updated translations
     */
    format(originalContent: string, updatedUnits: TranslationUnit[], extractResult: ExtractResult, options?: FormatOptions): FormatResult;
    /**
     * Update XLIFF 1.2 structure with translations
     */
    private updateXliff1;
    /**
     * Update XLIFF 2.0 structure with translations
     */
    private updateXliff2;
    /**
     * Walk all nodes in parsed XML structure
     */
    private walkNodes;
    /**
     * Build target element content with placeholders restored
     * Converts placeholder markers (e.g., {{PH}}) back to XML elements
     */
    private buildTargetContent;
    /**
     * Build a placeholder XML element from placeholder metadata
     */
    private buildPlaceholderElement;
}
//# sourceMappingURL=xliff.d.ts.map