import { FormatterError } from '../utils/errors';
import type {
  ExtractResult,
  FormatResult,
  TranslationUnit,
  FormatInfo,
} from '../types/translation';
import { BaseFormatter, FormatOptions, countChanges } from './base';

/**
 * JSON formatter for flat and nested translation files
 */
export class JsonFormatter extends BaseFormatter {
  readonly supportedFormats: FormatInfo['format'][] = ['json-flat', 'json-nested'];
  readonly fileExtensions = ['.json'];

  /**
   * Format JSON content with updated translations
   */
  format(
    originalContent: string,
    updatedUnits: TranslationUnit[],
    extractResult: ExtractResult,
    options?: FormatOptions
  ): FormatResult {
    try {
      // Create lookup map for updates
      const updateMap = new Map(updatedUnits.map(u => [u.id, u.target]));

      // Parse original to detect formatting
      const originalParsed = JSON.parse(originalContent) as Record<string, unknown>;
      const formatInfo = extractResult.formatInfo;

      let result: Record<string, unknown>;

      if (formatInfo.format === 'json-nested') {
        result = this.formatNested(originalParsed, updateMap);
      } else {
        result = this.formatFlat(originalParsed, updateMap);
      }

      // Detect original indentation
      const indent = options?.indent ?? this.detectIndent(originalContent);

      // Build output with same formatting
      const content = JSON.stringify(result, null, indent) + '\n';

      const changes = countChanges(extractResult.units, updatedUnits);

      return {
        content,
        updatedCount: changes.updated,
        unchangedCount: changes.unchanged,
      };
    } catch (error) {
      throw new FormatterError(
        `Failed to format JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        extractResult.formatInfo.format,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Format flat JSON structure
   */
  private formatFlat(
    original: Record<string, unknown>,
    updates: Map<string, string | undefined>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(original)) {
      const update = updates.get(key);
      if (update !== undefined) {
        result[key] = update;
      } else if (typeof value === 'string') {
        result[key] = value;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Format nested JSON structure
   */
  private formatNested(
    original: Record<string, unknown>,
    updates: Map<string, string | undefined>,
    prefix = ''
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(original)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        const update = updates.get(fullKey);
        result[key] = update !== undefined ? update : value;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.formatNested(value as Record<string, unknown>, updates, fullKey);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Detect indentation from original content
   */
  private detectIndent(content: string): string | number {
    // Look for first indented line
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\s+)/);
      if (match?.[1]) {
        const indent = match[1];
        // Check if tabs or spaces
        if (indent.includes('\t')) {
          return '\t';
        }
        return indent.length;
      }
    }

    // Default to 2 spaces
    return 2;
  }
}

/**
 * Create a new JSON file with translations
 */
export function createJsonFile(
  units: TranslationUnit[],
  nested: boolean,
  indent: string | number = 2
): string {
  let result: Record<string, unknown>;

  if (nested) {
    result = {};
    for (const unit of units) {
      setNestedValue(result, unit.id, unit.target ?? '');
    }
  } else {
    result = {};
    for (const unit of units) {
      result[unit.id] = unit.target ?? '';
    }
  }

  return JSON.stringify(result, null, indent) + '\n';
}

/**
 * Set a value in a nested object using dot notation path
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.');
  let current = obj;

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

/**
 * Merge two JSON translation files
 */
export function mergeJsonFiles(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
  nested: boolean
): Record<string, unknown> {
  if (!nested) {
    return { ...base, ...override };
  }

  return deepMerge(base, override);
}

/**
 * Deep merge two objects
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}
