import type { ExtractResult, FormatResult, TranslationUnit, FormatInfo } from '../types/translation';
import { BaseFormatter, FormatOptions } from './base';
/**
 * XLIFF formatter for 1.2 and 2.0 formats
 *
 * Uses targeted string replacement instead of full XML rebuild
 * to preserve original file formatting and minimize diffs.
 */
export declare class XliffFormatter extends BaseFormatter {
    readonly supportedFormats: FormatInfo['format'][];
    readonly fileExtensions: string[];
    /**
     * Format XLIFF content with updated translations
     *
     * Only modifies <target> elements for units that changed,
     * preserving the rest of the file byte-for-byte.
     */
    format(originalContent: string, updatedUnits: TranslationUnit[], extractResult: ExtractResult, options?: FormatOptions): FormatResult;
    /**
     * Patch a single trans-unit/unit in the XML string by replacing or inserting its <target>.
     * Returns the patched string or null if the unit was not found.
     */
    private patchUnit;
    /**
     * Insert new trans-unit/unit elements that don't exist in the target file.
     * Appends them before the closing </body> (XLIFF 1.2) or </file> (XLIFF 2.0) tag.
     */
    private insertNewUnits;
    /**
     * Build source XML content string, restoring placeholders
     */
    private buildSourceXmlString;
    /**
     * Build a <target>...</target> XML string with placeholders restored
     */
    private buildTargetXmlString;
    /**
     * Repair missing whitespace around placeholder markers in translated text.
     * Compares spacing patterns between source and target for each marker,
     * inserting spaces where the source had them but the translation dropped them.
     */
    private repairPlaceholderSpacing;
    /**
     * Build a self-closing XML element string from placeholder metadata
     */
    private buildPlaceholderXmlString;
    /**
     * Escape text content for XML
     */
    private escapeXml;
    /**
     * Escape attribute value for XML
     */
    private escapeXmlAttr;
}
//# sourceMappingURL=xliff.d.ts.map