import type { ExtractResult, FormatInfo } from '../types/translation';
import { BaseExtractor, ExtractOptions } from './base';
/**
 * Extractor for JSON translation files (flat and nested)
 */
export declare class JsonExtractor extends BaseExtractor {
    readonly supportedFormats: FormatInfo['format'][];
    readonly fileExtensions: string[];
    /**
     * Detect JSON format (flat vs nested)
     */
    detect(content: string): FormatInfo | null;
    /**
     * Check if JSON has nested structure
     */
    private hasNestedStructure;
    /**
     * Validate JSON content
     */
    validate(content: string): boolean;
    /**
     * Extract translation units from JSON file
     */
    extract(filePath: string, content: string, targetLanguage: string, _options?: ExtractOptions): Promise<ExtractResult>;
    /**
     * Extract from flat JSON structure
     */
    private extractFlat;
    /**
     * Extract from nested JSON structure
     */
    private extractNested;
    /**
     * Try to detect language code from file path
     */
    private detectLanguageFromPath;
    /**
     * Create hash of content for change detection
     */
    private hashContent;
}
/**
 * Helper to build nested JSON from flat key paths
 */
export declare function buildNestedJson(entries: Array<{
    id: string;
    value: string;
}>): Record<string, unknown>;
/**
 * Helper to flatten nested JSON to key paths
 */
export declare function flattenJson(obj: Record<string, unknown>, prefix?: string): Array<{
    id: string;
    value: string;
}>;
//# sourceMappingURL=json.d.ts.map