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
    format(originalContent: string, updatedUnits: TranslationUnit[], extractResult: ExtractResult, options?: FormatOptions): Promise<FormatResult>;
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
}
//# sourceMappingURL=xliff.d.ts.map