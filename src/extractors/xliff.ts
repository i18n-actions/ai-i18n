import { XMLParser } from 'fast-xml-parser';
import * as crypto from 'crypto';
import { ExtractorError } from '../utils/errors';
import type { ExtractResult, FormatInfo, TranslationUnit } from '../types/translation';
import { BaseExtractor, ExtractOptions } from './base';

/**
 * Type for parsed XLIFF document
 */
interface ParsedXliff {
  xliff?: {
    '@_version'?: string;
    '@_xmlns'?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * XLIFF namespace URIs
 */
const XLIFF_1_2_NS = 'urn:oasis:names:tc:xliff:document:1.2';
const XLIFF_2_0_NS = 'urn:oasis:names:tc:xliff:document:2.0';

/**
 * Extractor for XLIFF 1.2 and 2.0 files
 */
export class XliffExtractor extends BaseExtractor {
  readonly supportedFormats: FormatInfo['format'][] = ['xliff-1.2', 'xliff-2.0'];
  readonly fileExtensions = ['.xliff', '.xlf', '.xml'];

  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    preserveOrder: false,
    trimValues: false,
    parseAttributeValue: false,
  });

  /**
   * Detect XLIFF version from content
   */
  detect(content: string): FormatInfo | null {
    try {
      // Quick check for XLIFF markers
      if (!content.includes('xliff')) {
        return null;
      }

      const parsed = this.parser.parse(content) as ParsedXliff;
      const xliff = parsed.xliff;

      if (!xliff) {
        return null;
      }

      // Check version attribute
      const version = xliff['@_version'];
      if (typeof version === 'string' && version.startsWith('2.')) {
        return { format: 'xliff-2.0', version };
      }
      if (typeof version === 'string' && version.startsWith('1.')) {
        return { format: 'xliff-1.2', version };
      }

      // Check namespace
      const xmlns = xliff['@_xmlns'];
      if (xmlns === XLIFF_2_0_NS) {
        return { format: 'xliff-2.0', version: '2.0' };
      }
      if (xmlns === XLIFF_1_2_NS) {
        return { format: 'xliff-1.2', version: '1.2' };
      }

      // Default to 1.2 if xliff element exists
      return { format: 'xliff-1.2', version: '1.2' };
    } catch {
      return null;
    }
  }

  /**
   * Validate XLIFF content
   */
  validate(content: string): boolean {
    const formatInfo = this.detect(content);
    if (!formatInfo) {
      throw new ExtractorError('Invalid XLIFF content: could not detect format', 'unknown');
    }
    return true;
  }

  /**
   * Extract translation units from XLIFF file
   */
  extract(
    filePath: string,
    content: string,
    targetLanguage: string,
    options?: ExtractOptions
  ): ExtractResult {
    const formatInfo = this.detect(content);

    if (!formatInfo) {
      throw new ExtractorError('Could not detect XLIFF format', filePath);
    }

    try {
      const parsed = this.parser.parse(content) as Record<string, unknown>;

      if (formatInfo.format === 'xliff-2.0') {
        return this.extractXliff2(filePath, content, parsed, targetLanguage, formatInfo, options);
      }
      return this.extractXliff1(filePath, content, parsed, targetLanguage, formatInfo, options);
    } catch (error) {
      throw new ExtractorError(
        `Failed to parse XLIFF file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filePath,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract from XLIFF 1.2 format
   */
  private extractXliff1(
    filePath: string,
    content: string,
    parsed: Record<string, unknown>,
    targetLanguage: string,
    formatInfo: FormatInfo,
    options?: ExtractOptions
  ): ExtractResult {
    const units: TranslationUnit[] = [];
    const xliff = parsed['xliff'] as Record<string, unknown>;

    if (!xliff) {
      throw new ExtractorError('Invalid XLIFF 1.2: missing xliff element', filePath);
    }

    // Get source language from file element
    let sourceLanguage = 'en';
    const fileElement = this.normalizeArray(xliff['file'])[0] as
      | Record<string, unknown>
      | undefined;

    if (fileElement) {
      sourceLanguage = (fileElement['@_source-language'] as string) ?? sourceLanguage;
    }

    // Process file elements
    const files = this.normalizeArray(xliff['file']) as Array<Record<string, unknown>>;

    for (const file of files) {
      const body = file['body'] as Record<string, unknown> | undefined;
      if (!body) {
        continue;
      }

      const transUnits = this.normalizeArray(body['trans-unit']) as Array<Record<string, unknown>>;

      for (const unit of transUnits) {
        const id = unit['@_id'] as string;
        if (!id) {
          continue;
        }

        const source = this.extractTextContent(unit['source']);
        const target = this.extractTextContent(unit['target']);

        // Get notes if requested
        let notes: string | undefined;
        if (options?.includeNotes !== false) {
          const noteElements = this.normalizeArray(unit['note']) as Array<Record<string, unknown>>;
          notes = noteElements
            .map(n => this.extractTextContent(n))
            .filter(Boolean)
            .join('\n');
        }

        // Get context
        let context: string | undefined;
        if (options?.includeContext !== false) {
          const contextGroup = unit['context-group'] as Record<string, unknown> | undefined;
          if (contextGroup) {
            const contexts = this.normalizeArray(contextGroup['context']) as Array<
              Record<string, unknown>
            >;
            context = contexts
              .map(c => this.extractTextContent(c))
              .filter(Boolean)
              .join(' | ');
          }
        }

        const hash = this.hashContent(source);

        units.push({
          id,
          source,
          target: target || undefined,
          context,
          metadata: {
            file: filePath,
            notes: notes || undefined,
            state: unit['@_state'] as string | undefined,
            approved: unit['@_approved'] === 'yes',
          },
          hash,
        });
      }
    }

    return {
      filePath,
      sourceLanguage,
      targetLanguage,
      units,
      formatInfo,
      originalContent: content,
    };
  }

  /**
   * Extract from XLIFF 2.0 format
   */
  private extractXliff2(
    filePath: string,
    content: string,
    parsed: Record<string, unknown>,
    targetLanguage: string,
    formatInfo: FormatInfo,
    options?: ExtractOptions
  ): ExtractResult {
    const units: TranslationUnit[] = [];
    const xliff = parsed['xliff'] as Record<string, unknown>;

    if (!xliff) {
      throw new ExtractorError('Invalid XLIFF 2.0: missing xliff element', filePath);
    }

    const sourceLanguage = (xliff['@_srcLang'] as string) ?? 'en';

    // Process file elements
    const files = this.normalizeArray(xliff['file']) as Array<Record<string, unknown>>;

    for (const file of files) {
      // XLIFF 2.0 uses 'unit' elements directly or within 'group'
      const fileUnits = this.normalizeArray(file['unit']) as Array<Record<string, unknown>>;
      const groups = this.normalizeArray(file['group']) as Array<Record<string, unknown>>;

      // Process direct units
      this.processXliff2Units(fileUnits, units, filePath, options);

      // Process units within groups
      for (const group of groups) {
        const groupUnits = this.normalizeArray(group['unit']) as Array<Record<string, unknown>>;
        this.processXliff2Units(groupUnits, units, filePath, options);
      }
    }

    return {
      filePath,
      sourceLanguage,
      targetLanguage,
      units,
      formatInfo,
      originalContent: content,
    };
  }

  /**
   * Process XLIFF 2.0 unit elements
   */
  private processXliff2Units(
    unitElements: Array<Record<string, unknown>>,
    units: TranslationUnit[],
    filePath: string,
    options?: ExtractOptions
  ): void {
    for (const unit of unitElements) {
      const id = unit['@_id'] as string;
      if (!id) {
        continue;
      }

      // XLIFF 2.0 uses segment element
      const segment = unit['segment'] as Record<string, unknown> | undefined;
      if (!segment) {
        continue;
      }

      const source = this.extractTextContent(segment['source']);
      const target = this.extractTextContent(segment['target']);

      // Get notes if requested
      let notes: string | undefined;
      if (options?.includeNotes !== false) {
        const notesElement = unit['notes'] as Record<string, unknown> | undefined;
        if (notesElement) {
          const noteElements = this.normalizeArray(notesElement['note']) as Array<
            Record<string, unknown>
          >;
          notes = noteElements
            .map(n => this.extractTextContent(n))
            .filter(Boolean)
            .join('\n');
        }
      }

      const hash = this.hashContent(source);

      units.push({
        id,
        source,
        target: target || undefined,
        metadata: {
          file: filePath,
          notes: notes || undefined,
          state: segment['@_state'] as string | undefined,
        },
        hash,
      });
    }
  }

  /**
   * Normalize value to array
   */
  private normalizeArray(value: unknown): unknown[] {
    if (value === undefined || value === null) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Extract text content from element (handles mixed content)
   */
  private extractTextContent(element: unknown): string {
    if (element === undefined || element === null) {
      return '';
    }

    if (typeof element === 'string') {
      return element;
    }

    if (typeof element === 'object') {
      const obj = element as Record<string, unknown>;

      // Handle text node
      if ('#text' in obj) {
        return String(obj['#text']);
      }

      // Handle complex content (inline elements like <ph>, <x/>, etc.)
      let result = '';
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('@_')) {
          continue;
        } // Skip attributes
        if (key === '#text') {
          result += String(value);
        } else if (Array.isArray(value)) {
          for (const item of value) {
            result += this.extractTextContent(item);
          }
        } else if (typeof value === 'object' && value !== null) {
          result += this.extractTextContent(value);
        }
      }
      return result;
    }

    return String(element);
  }

  /**
   * Create hash of content for change detection
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}
