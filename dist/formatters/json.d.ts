import type { ExtractResult, FormatResult, TranslationUnit, FormatInfo } from '../types/translation';
import { BaseFormatter, FormatOptions } from './base';
/**
 * JSON formatter for flat and nested translation files
 */
export declare class JsonFormatter extends BaseFormatter {
    readonly supportedFormats: FormatInfo['format'][];
    readonly fileExtensions: string[];
    /**
     * Format JSON content with updated translations
     */
    format(originalContent: string, updatedUnits: TranslationUnit[], extractResult: ExtractResult, options?: FormatOptions): Promise<FormatResult>;
    /**
     * Format flat JSON structure
     */
    private formatFlat;
    /**
     * Format nested JSON structure
     */
    private formatNested;
    /**
     * Detect indentation from original content
     */
    private detectIndent;
}
/**
 * Create a new JSON file with translations
 */
export declare function createJsonFile(units: TranslationUnit[], nested: boolean, indent?: string | number): string;
/**
 * Merge two JSON translation files
 */
export declare function mergeJsonFiles(base: Record<string, unknown>, override: Record<string, unknown>, nested: boolean): Record<string, unknown>;
//# sourceMappingURL=json.d.ts.map