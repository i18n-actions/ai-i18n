import type { FileFormat } from '../config/types';
import type { ExtractResult, FormatInfo } from '../types/translation';
import { BaseExtractor, ExtractOptions, ExtractorRegistry } from './base';
/**
 * Create and configure the extractor registry with all available extractors
 */
export declare function createExtractorRegistry(): ExtractorRegistry;
/**
 * Options for the extractor factory
 */
export interface ExtractorFactoryOptions {
    format?: FileFormat;
    extractOptions?: ExtractOptions;
}
/**
 * Get an appropriate extractor for a file
 */
export declare function getExtractor(filePath: string, content: string, format?: FileFormat): {
    extractor: BaseExtractor;
    formatInfo: FormatInfo;
};
/**
 * Extract translation units from a single file
 */
export declare function extractFromFile(filePath: string, targetLanguage: string, options?: ExtractorFactoryOptions): Promise<ExtractResult>;
/**
 * Find and extract from multiple files matching a pattern
 */
export declare function extractFromPattern(pattern: string, targetLanguage: string, options?: ExtractorFactoryOptions & {
    exclude?: string[];
}): Promise<ExtractResult[]>;
/**
 * Get all supported file extensions
 */
export declare function getSupportedExtensions(): string[];
/**
 * Get all supported formats
 */
export declare function getSupportedFormats(): FormatInfo['format'][];
//# sourceMappingURL=factory.d.ts.map