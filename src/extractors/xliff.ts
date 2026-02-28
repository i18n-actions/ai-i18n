import { XMLParser } from 'fast-xml-parser';
import { hashContent as sharedHashContent } from '../differ/hasher';
import { ExtractorError } from '../utils/errors';
import type {
  ExtractResult,
  FormatInfo,
  TranslationUnit,
  XliffPlaceholder,
} from '../types/translation';
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
   * Ordered parser preserves element position relative to text nodes.
   * Required for correct extraction of inline elements like <x id="PH"/>
   * interspersed with text content.
   */
  private orderedParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    preserveOrder: true,
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

    // Build ordered source map for correct inline element extraction
    const orderedMap = this.buildOrderedSourceMap(content, 'xliff-1.2');

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

        // Extract source with placeholders from ordered map (preserves element position)
        const ordered = orderedMap.get(id);
        const ctx = { placeholders: [] as XliffPlaceholder[], counter: 0 };
        const source = ordered?.source.length
          ? this.extractOrderedContent(ordered.source, ctx)
          : this.extractTextContent(unit['source']);
        const placeholders = ctx.placeholders;

        // Extract target with placeholder markers
        const targetCtx = { placeholders: [] as XliffPlaceholder[], counter: 0 };
        const target = ordered?.target.length
          ? this.extractOrderedContent(ordered.target, targetCtx)
          : this.extractTextContent(unit['target']);

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
            placeholders: placeholders.length > 0 ? placeholders : undefined,
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

    // Build ordered source map for correct inline element extraction
    const orderedMap = this.buildOrderedSourceMap(content, 'xliff-2.0');

    const sourceLanguage = (xliff['@_srcLang'] as string) ?? 'en';

    // Process file elements
    const files = this.normalizeArray(xliff['file']) as Array<Record<string, unknown>>;

    for (const file of files) {
      // XLIFF 2.0 uses 'unit' elements directly or within 'group'
      const fileUnits = this.normalizeArray(file['unit']) as Array<Record<string, unknown>>;
      const groups = this.normalizeArray(file['group']) as Array<Record<string, unknown>>;

      // Process direct units
      this.processXliff2Units(fileUnits, units, filePath, orderedMap, options);

      // Process units within groups
      for (const group of groups) {
        const groupUnits = this.normalizeArray(group['unit']) as Array<Record<string, unknown>>;
        this.processXliff2Units(groupUnits, units, filePath, orderedMap, options);
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
    orderedMap: Map<string, { source: unknown[]; target: unknown[] }>,
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

      // Extract source with placeholders from ordered map (preserves element position)
      const ordered = orderedMap.get(id);
      const ctx = { placeholders: [] as XliffPlaceholder[], counter: 0 };
      const source = ordered?.source.length
        ? this.extractOrderedContent(ordered.source, ctx)
        : this.extractTextContent(segment['source']);
      const placeholders = ctx.placeholders;

      // Extract target with placeholder markers
      const targetCtx = { placeholders: [] as XliffPlaceholder[], counter: 0 };
      const target = ordered?.target.length
        ? this.extractOrderedContent(ordered.target, targetCtx)
        : this.extractTextContent(segment['target']);

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
          placeholders: placeholders.length > 0 ? placeholders : undefined,
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

  /** XLIFF inline element tag names that should be treated as placeholders */
  private static readonly PLACEHOLDER_TAGS = new Set([
    'x', // XLIFF 1.2: standalone placeholder (e.g., interpolations)
    'ph', // XLIFF 1.2/2.0: placeholder
    'bx', // XLIFF 1.2: begin paired placeholder
    'ex', // XLIFF 1.2: end paired placeholder
    'bpt', // XLIFF 1.2: begin paired tag
    'ept', // XLIFF 1.2: end paired tag
    'it', // XLIFF 1.2: isolated tag
    'g', // XLIFF 1.2: generic group inline
    'mrk', // XLIFF 1.2: marker
    'pc', // XLIFF 2.0: paired code
    'sc', // XLIFF 2.0: start code
    'ec', // XLIFF 2.0: end code
  ]);

  /**
   * Extract text content from element (plain text, no placeholder tracking).
   * Used for notes, context, and other non-inline-element fields.
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
      if ('#text' in obj) {
        return String(obj['#text']);
      }
      let result = '';
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('@_')) {
          continue;
        }
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
   * Build a map from unit ID to ordered (preserveOrder: true) children of source/target.
   * This preserves the position of inline XML elements relative to text nodes.
   */
  private buildOrderedSourceMap(
    content: string,
    format: 'xliff-1.2' | 'xliff-2.0'
  ): Map<string, { source: unknown[]; target: unknown[] }> {
    const map = new Map<string, { source: unknown[]; target: unknown[] }>();
    const parsed = this.orderedParser.parse(content) as unknown[];

    const walk = (nodes: unknown[]): void => {
      for (const node of nodes) {
        if (typeof node !== 'object' || node === null) {
          continue;
        }
        const obj = node as Record<string, unknown>;

        if (format === 'xliff-1.2' && 'trans-unit' in obj) {
          const children = obj['trans-unit'] as unknown[];
          if (!Array.isArray(children)) {
            continue;
          }
          const id = this.getOrderedAttr(obj, '@_id');
          if (!id) {
            continue;
          }
          map.set(id, {
            source: this.getOrderedElementChildren(children, 'source'),
            target: this.getOrderedElementChildren(children, 'target'),
          });
        } else if (format === 'xliff-2.0' && 'unit' in obj) {
          const unitChildren = obj['unit'] as unknown[];
          if (!Array.isArray(unitChildren)) {
            continue;
          }
          const id = this.getOrderedAttr(obj, '@_id');
          if (!id) {
            continue;
          }
          const segmentChildren = this.getOrderedElementChildren(unitChildren, 'segment');
          map.set(id, {
            source: this.getOrderedElementChildren(segmentChildren, 'source'),
            target: this.getOrderedElementChildren(segmentChildren, 'target'),
          });
        }

        for (const value of Object.values(obj)) {
          if (Array.isArray(value)) {
            walk(value);
          }
        }
      }
    };

    walk(parsed);
    return map;
  }

  /**
   * Get an attribute from a preserveOrder node's ':@' entry.
   */
  private getOrderedAttr(node: Record<string, unknown>, attrName: string): string | undefined {
    const attrs = node[':@'] as Record<string, unknown> | undefined;
    return attrs && attrName in attrs ? String(attrs[attrName]) : undefined;
  }

  /**
   * Find the children array of a named element within a preserveOrder children array.
   */
  private getOrderedElementChildren(children: unknown[], elementName: string): unknown[] {
    for (const child of children) {
      if (
        typeof child === 'object' &&
        child !== null &&
        elementName in (child as Record<string, unknown>)
      ) {
        const el = (child as Record<string, unknown>)[elementName];
        return Array.isArray(el) ? el : [];
      }
    }
    return [];
  }

  /**
   * Walk ordered (preserveOrder: true) children and extract text with {{marker}} placeholders.
   * Correctly preserves the position of inline elements relative to text.
   */
  private extractOrderedContent(
    children: unknown[],
    ctx: { placeholders: XliffPlaceholder[]; counter: number }
  ): string {
    let result = '';
    for (const node of children) {
      if (typeof node !== 'object' || node === null) {
        continue;
      }
      const obj = node as Record<string, unknown>;

      if ('#text' in obj) {
        result += String(obj['#text']);
        continue;
      }

      // Find tag name (key that isn't ':@' or '#text')
      const tagName = Object.keys(obj).find(k => k !== ':@' && k !== '#text');
      if (!tagName) {
        continue;
      }

      if (XliffExtractor.PLACEHOLDER_TAGS.has(tagName)) {
        const attrs = obj[':@'] as Record<string, unknown> | undefined;
        const attributes: Record<string, string> = {};
        if (attrs) {
          for (const [key, val] of Object.entries(attrs)) {
            if (key.startsWith('@_')) {
              attributes[key.substring(2)] = String(val);
            }
          }
        }

        let markerName: string;
        if (attributes['id']) {
          markerName = attributes['id'];
        } else if (attributes['equiv-text']) {
          markerName = attributes['equiv-text'].replace(/[^a-zA-Z0-9_]/g, '_');
        } else {
          markerName = String(ctx.counter++);
        }

        const marker = `{{${markerName}}}`;
        ctx.placeholders.push({ marker, tagName, attributes });
        result += marker;
      } else {
        // Non-placeholder element — recurse into its children
        const innerChildren = obj[tagName];
        if (Array.isArray(innerChildren)) {
          result += this.extractOrderedContent(innerChildren, ctx);
        }
      }
    }
    return result;
  }

  /**
   * Extract text content and placeholders from ordered children.
   * Returns both the text (with placeholder markers) and the placeholder array.
   */
  extractContentWithPlaceholders(element: unknown): {
    text: string;
    placeholders: XliffPlaceholder[];
  } {
    // This public method is kept for backward compatibility but only works
    // correctly with preserveOrder: false parsed elements (no inline elements).
    // For correct extraction, use extractOrderedContent with ordered children.
    const ctx = { placeholders: [] as XliffPlaceholder[], counter: 0 };
    if (Array.isArray(element)) {
      return { text: this.extractOrderedContent(element, ctx), placeholders: ctx.placeholders };
    }
    // Fallback for preserveOrder: false elements (no inline element ordering)
    return { text: this.extractTextContent(element), placeholders: [] };
  }

  /**
   * Create hash of content for change detection
   */
  private hashContent(content: string): string {
    return sharedHashContent(content);
  }
}
