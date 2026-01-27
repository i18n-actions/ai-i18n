import type {
  ExtractResult,
  FormatResult,
  TranslationUnit,
  FormatInfo,
} from '../types/translation';

/**
 * Options for formatting output
 */
export interface FormatOptions {
  /**
   * Whether to preserve original formatting/whitespace
   */
  preserveFormatting?: boolean;

  /**
   * Whether to add translator comments
   */
  addComments?: boolean;

  /**
   * Indentation string (default: 2 spaces)
   */
  indent?: string;

  /**
   * Mark translated units with a state
   */
  markAsTranslated?: boolean;
}

/**
 * Base formatter interface for writing translation files
 */
export abstract class BaseFormatter {
  /**
   * The format(s) this formatter supports
   */
  abstract readonly supportedFormats: FormatInfo['format'][];

  /**
   * File extensions this formatter produces
   */
  abstract readonly fileExtensions: string[];

  /**
   * Format translated units back into file content
   *
   * @param originalContent Original file content
   * @param updatedUnits Units with translations
   * @param extractResult Original extraction result (for structure reference)
   * @param options Formatting options
   */
  abstract format(
    originalContent: string,
    updatedUnits: TranslationUnit[],
    extractResult: ExtractResult,
    options?: FormatOptions
  ): FormatResult;

  /**
   * Check if this formatter supports a given format
   */
  supportsFormat(format: FormatInfo['format']): boolean {
    return this.supportedFormats.includes(format);
  }

  /**
   * Check if this formatter supports a given file extension
   */
  supportsExtension(extension: string): boolean {
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    return this.fileExtensions.includes(ext.toLowerCase());
  }
}

/**
 * Registry of available formatters
 */
export class FormatterRegistry {
  private formatters: BaseFormatter[] = [];

  /**
   * Register a formatter
   */
  register(formatter: BaseFormatter): void {
    this.formatters.push(formatter);
  }

  /**
   * Get a formatter for a given format
   */
  getByFormat(format: FormatInfo['format']): BaseFormatter | undefined {
    return this.formatters.find(f => f.supportsFormat(format));
  }

  /**
   * Get a formatter for a given file extension
   */
  getByExtension(extension: string): BaseFormatter | undefined {
    return this.formatters.find(f => f.supportsExtension(extension));
  }

  /**
   * Get all registered formatters
   */
  getAll(): BaseFormatter[] {
    return [...this.formatters];
  }
}

/**
 * Merge updated units with original units
 */
export function mergeUnits(
  originalUnits: TranslationUnit[],
  updatedUnits: TranslationUnit[]
): TranslationUnit[] {
  const updateMap = new Map(updatedUnits.map(u => [u.id, u]));

  return originalUnits.map(original => {
    const updated = updateMap.get(original.id);
    if (updated) {
      return {
        ...original,
        target: updated.target,
        metadata: {
          ...original.metadata,
          ...updated.metadata,
        },
      };
    }
    return original;
  });
}

/**
 * Count changes between original and updated units
 */
export function countChanges(
  originalUnits: TranslationUnit[],
  updatedUnits: TranslationUnit[]
): { updated: number; unchanged: number } {
  const updateMap = new Map(updatedUnits.map(u => [u.id, u]));

  let updated = 0;
  let unchanged = 0;

  for (const original of originalUnits) {
    const update = updateMap.get(original.id);
    if (update && update.target !== original.target) {
      updated++;
    } else {
      unchanged++;
    }
  }

  return { updated, unchanged };
}
