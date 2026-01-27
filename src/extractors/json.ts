import * as crypto from 'crypto';
import { ExtractorError } from '../utils/errors';
import type { ExtractResult, FormatInfo, TranslationUnit } from '../types/translation';
import { BaseExtractor, ExtractOptions } from './base';

/**
 * Extractor for JSON translation files (flat and nested)
 */
export class JsonExtractor extends BaseExtractor {
  readonly supportedFormats: FormatInfo['format'][] = ['json-flat', 'json-nested'];
  readonly fileExtensions = ['.json'];

  /**
   * Detect JSON format (flat vs nested)
   */
  detect(content: string): FormatInfo | null {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return null;
      }

      // Check if nested by looking at values
      const isNested = this.hasNestedStructure(parsed);

      return {
        format: isNested ? 'json-nested' : 'json-flat',
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if JSON has nested structure
   */
  private hasNestedStructure(obj: Record<string, unknown>, depth = 0): boolean {
    if (depth > 10) {
      return true;
    } // Assume nested if too deep

    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Check if it's a nested namespace (has string children)
        const nestedObj = value as Record<string, unknown>;
        const hasStringChildren = Object.values(nestedObj).some(v => typeof v === 'string');
        if (hasStringChildren) {
          return true;
        }
        // Recurse to check deeper
        if (this.hasNestedStructure(nestedObj, depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate JSON content
   */
  validate(content: string): boolean {
    try {
      const parsed: unknown = JSON.parse(content);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new ExtractorError('Invalid JSON: root must be an object', 'unknown');
      }
      return true;
    } catch (error) {
      if (error instanceof ExtractorError) {
        throw error;
      }
      throw new ExtractorError(
        `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown'
      );
    }
  }

  /**
   * Extract translation units from JSON file
   */
  extract(
    filePath: string,
    content: string,
    targetLanguage: string,
    _options?: ExtractOptions
  ): ExtractResult {
    const formatInfo = this.detect(content);

    if (!formatInfo) {
      throw new ExtractorError('Could not detect JSON format', filePath);
    }

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const units: TranslationUnit[] = [];

      if (formatInfo.format === 'json-nested') {
        this.extractNested(parsed, units, filePath, []);
      } else {
        this.extractFlat(parsed, units, filePath);
      }

      // Try to detect source language from file path or default to 'en'
      const sourceLanguage = this.detectLanguageFromPath(filePath) ?? 'en';

      return {
        filePath,
        sourceLanguage,
        targetLanguage,
        units,
        formatInfo,
        originalContent: content,
      };
    } catch (error) {
      if (error instanceof ExtractorError) {
        throw error;
      }
      throw new ExtractorError(
        `Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filePath,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract from flat JSON structure
   */
  private extractFlat(
    obj: Record<string, unknown>,
    units: TranslationUnit[],
    filePath: string
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const hash = this.hashContent(value);
        units.push({
          id: key,
          source: value,
          target: undefined,
          metadata: {
            file: filePath,
          },
          hash,
        });
      }
    }
  }

  /**
   * Extract from nested JSON structure
   */
  private extractNested(
    obj: Record<string, unknown>,
    units: TranslationUnit[],
    filePath: string,
    path: string[]
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];

      if (typeof value === 'string') {
        const id = currentPath.join('.');
        const hash = this.hashContent(value);
        units.push({
          id,
          source: value,
          target: undefined,
          metadata: {
            file: filePath,
          },
          hash,
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.extractNested(value as Record<string, unknown>, units, filePath, currentPath);
      }
    }
  }

  /**
   * Try to detect language code from file path
   */
  private detectLanguageFromPath(filePath: string): string | null {
    // Common patterns: en.json, en-US.json, messages.en.json, locale/en/messages.json
    const patterns = [
      /\/([a-z]{2}(?:-[A-Z]{2})?)\//i, // locale/en/
      /\.([a-z]{2}(?:-[A-Z]{2})?)\.json$/i, // .en.json
      /\/([a-z]{2}(?:-[A-Z]{2})?)\.json$/i, // /en.json
      /([a-z]{2}(?:-[A-Z]{2})?)\.json$/i, // en.json
    ];

    for (const pattern of patterns) {
      const match = filePath.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Create hash of content for change detection
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}

/**
 * Helper to build nested JSON from flat key paths
 */
export function buildNestedJson(
  entries: Array<{ id: string; value: string }>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const { id, value } of entries) {
    const parts = id.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === undefined) {
        continue;
      }

      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart !== undefined) {
      current[lastPart] = value;
    }
  }

  return result;
}

/**
 * Helper to flatten nested JSON to key paths
 */
export function flattenJson(
  obj: Record<string, unknown>,
  prefix = ''
): Array<{ id: string; value: string }> {
  const result: Array<{ id: string; value: string }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const id = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result.push({ id, value });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result.push(...flattenJson(value as Record<string, unknown>, id));
    }
  }

  return result;
}
