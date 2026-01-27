import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { ExtractorError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { FileFormat } from '../config/types';
import type { ExtractResult, FormatInfo } from '../types/translation';
import { BaseExtractor, ExtractOptions, ExtractorRegistry } from './base';
import { XliffExtractor } from './xliff';
import { JsonExtractor } from './json';

/**
 * Create and configure the extractor registry with all available extractors
 */
export function createExtractorRegistry(): ExtractorRegistry {
  const registry = new ExtractorRegistry();

  registry.register(new XliffExtractor());
  registry.register(new JsonExtractor());

  return registry;
}

// Default registry instance
const defaultRegistry = createExtractorRegistry();

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
export function getExtractor(
  filePath: string,
  content: string,
  format?: FileFormat
): { extractor: BaseExtractor; formatInfo: FormatInfo } {
  // If format is specified and not 'auto', use that
  if (format && format !== 'auto') {
    const extractor = defaultRegistry.getByFormat(format);
    if (!extractor) {
      throw new ExtractorError(`No extractor found for format: ${format}`, filePath);
    }
    return {
      extractor,
      formatInfo: { format },
    };
  }

  // Try to detect format from content
  const detected = defaultRegistry.detect(content);
  if (detected) {
    return detected;
  }

  // Fall back to file extension
  const ext = path.extname(filePath).toLowerCase();
  const extractorByExt = defaultRegistry.getByExtension(ext);

  if (extractorByExt) {
    const formatInfo = extractorByExt.detect(content);
    if (formatInfo) {
      return { extractor: extractorByExt, formatInfo };
    }
  }

  throw new ExtractorError(
    `Could not determine format for file: ${filePath}. Try specifying format explicitly.`,
    filePath
  );
}

/**
 * Extract translation units from a single file
 */
export function extractFromFile(
  filePath: string,
  targetLanguage: string,
  options?: ExtractorFactoryOptions
): ExtractResult {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new ExtractorError(`File not found: ${absolutePath}`, absolutePath);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const { extractor, formatInfo } = getExtractor(absolutePath, content, options?.format);

  logger.debug(`Extracting from ${filePath} using ${formatInfo.format} extractor`);

  const result = extractor.extract(absolutePath, content, targetLanguage, options?.extractOptions);

  // Ensure formatInfo is set correctly
  result.formatInfo = formatInfo;

  return result;
}

/**
 * Find and extract from multiple files matching a pattern
 */
export async function extractFromPattern(
  pattern: string,
  targetLanguage: string,
  options?: ExtractorFactoryOptions & { exclude?: string[] }
): Promise<ExtractResult[]> {
  const files = await glob(pattern, {
    ignore: options?.exclude ?? [],
    nodir: true,
  });

  if (files.length === 0) {
    logger.warning(`No files found matching pattern: ${pattern}`);
    return [];
  }

  logger.info(`Found ${files.length} files matching pattern: ${pattern}`);

  const results: ExtractResult[] = [];

  for (const file of files) {
    try {
      const result = extractFromFile(file, targetLanguage, options);
      results.push(result);
    } catch (error) {
      if (error instanceof ExtractorError) {
        logger.warning(`Failed to extract from ${file}: ${error.message}`);
      } else {
        logger.warning(`Unexpected error extracting from ${file}: ${String(error)}`);
      }
    }
  }

  return results;
}

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  const extensions = new Set<string>();
  for (const extractor of defaultRegistry.getAll()) {
    for (const ext of extractor.fileExtensions) {
      extensions.add(ext);
    }
  }
  return Array.from(extensions);
}

/**
 * Get all supported formats
 */
export function getSupportedFormats(): FormatInfo['format'][] {
  const formats = new Set<FormatInfo['format']>();
  for (const extractor of defaultRegistry.getAll()) {
    for (const format of extractor.supportedFormats) {
      formats.add(format);
    }
  }
  return Array.from(formats);
}
