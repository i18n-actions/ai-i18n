import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { FormatterError } from '../utils/errors';
import { logger } from '../utils/logger';
import type {
  ExtractResult,
  FormatResult,
  TranslationUnit,
  FormatInfo,
  XliffPlaceholder,
} from '../types/translation';
import { BaseFormatter, FormatOptions, mergeUnits, countChanges } from './base';

/**
 * XLIFF formatter for 1.2 and 2.0 formats
 */
export class XliffFormatter extends BaseFormatter {
  readonly supportedFormats: FormatInfo['format'][] = ['xliff-1.2', 'xliff-2.0'];
  readonly fileExtensions = ['.xliff', '.xlf', '.xml'];

  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    preserveOrder: true,
    trimValues: false,
    parseAttributeValue: false,
  });

  private builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    preserveOrder: true,
    format: true,
    indentBy: '  ',
    suppressEmptyNode: false,
  });

  /**
   * Format XLIFF content with updated translations
   */
  format(
    originalContent: string,
    updatedUnits: TranslationUnit[],
    extractResult: ExtractResult,
    options?: FormatOptions
  ): FormatResult {
    try {
      const merged = mergeUnits(extractResult.units, updatedUnits);
      const changes = countChanges(extractResult.units, updatedUnits);

      const updatedWithTargets = updatedUnits.filter(u => u.target).length;
      const mergedWithTargets = merged.filter(u => u.target).length;
      logger.info(
        `XLIFF merge stats: input=${updatedUnits.length} (${updatedWithTargets} with targets), ` +
          `merged=${merged.length} (${mergedWithTargets} with targets)`
      );

      // Parse original to preserve structure
      const parsed = this.parser.parse(originalContent) as unknown[];

      // Update based on format version
      if (extractResult.formatInfo.format === 'xliff-2.0') {
        this.updateXliff2(parsed, merged, options);
      } else {
        this.updateXliff1(parsed, merged, options);
      }

      // Rebuild XML
      let content = this.builder.build(parsed) as string;

      // Ensure XML declaration
      if (!content.startsWith('<?xml')) {
        content = '<?xml version="1.0" encoding="UTF-8"?>\n' + content;
      }

      return {
        content,
        updatedCount: changes.updated,
        unchangedCount: changes.unchanged,
      };
    } catch (error) {
      throw new FormatterError(
        `Failed to format XLIFF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        extractResult.formatInfo.format,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update XLIFF 1.2 structure with translations
   */
  private updateXliff1(parsed: unknown[], units: TranslationUnit[], options?: FormatOptions): void {
    const unitMap = new Map(units.map(u => [u.id, u]));
    const unitsWithTargets = units.filter(u => u.target).length;
    logger.debug(`XLIFF formatter: ${unitsWithTargets}/${units.length} units have targets`);

    let foundCount = 0;
    let updatedCount = 0;

    this.walkNodes(parsed, (node: Record<string, unknown>) => {
      if ('trans-unit' in node) {
        foundCount++;
        const transUnit = node['trans-unit'] as Record<string, unknown>[];
        if (!Array.isArray(transUnit)) {
          logger.debug(`trans-unit is not an array`);
          return;
        }

        // Find the trans-unit attributes
        const attrs = transUnit.find(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && ':@' in item
        );

        if (!attrs) {
          logger.debug(`No attrs found for trans-unit`);
          return;
        }

        const attrsObj = attrs[':@'] as Record<string, unknown>;
        const id = attrsObj?.['@_id'] as string | undefined;
        if (!id) {
          logger.debug(`No id found in attrs`);
          return;
        }

        const unit = unitMap.get(id);
        if (!unit) {
          logger.debug(`Unit ${id} not found in unitMap`);
          return;
        }
        if (!unit.target) {
          return;
        }

        updatedCount++;

        // Find or create target element
        const targetIndex = transUnit.findIndex(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && 'target' in item
        );

        // Build target content with placeholders restored
        const targetContent = this.buildTargetContent(unit.target, unit.metadata.placeholders);

        if (targetIndex === -1) {
          // Insert target after source
          const sourceIndex = transUnit.findIndex(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null && 'source' in item
          );

          if (sourceIndex !== -1) {
            const targetNode: Record<string, unknown> = {
              target: targetContent,
            };

            if (options?.markAsTranslated) {
              targetNode[':@'] = { '@_state': 'translated' };
            }

            transUnit.splice(sourceIndex + 1, 0, targetNode);
          }
        } else {
          // Update existing target
          const targetNode = transUnit[targetIndex];
          targetNode['target'] = targetContent;

          if (options?.markAsTranslated) {
            if (!targetNode[':@']) {
              targetNode[':@'] = {};
            }
            (targetNode[':@'] as Record<string, unknown>)['@_state'] = 'translated';
          }
        }
      }
    });

    logger.info(
      `XLIFF formatter: found ${foundCount} trans-units in XML, updated ${updatedCount} with translations`
    );
  }

  /**
   * Update XLIFF 2.0 structure with translations
   */
  private updateXliff2(parsed: unknown[], units: TranslationUnit[], options?: FormatOptions): void {
    const unitMap = new Map(units.map(u => [u.id, u]));

    this.walkNodes(parsed, (node: Record<string, unknown>) => {
      if ('unit' in node) {
        const unitNode = node['unit'] as Record<string, unknown>[];
        if (!Array.isArray(unitNode)) {
          return;
        }

        // Find unit attributes
        const attrs = unitNode.find(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && ':@' in item
        );

        if (!attrs) {
          return;
        }

        const attrsObj = attrs[':@'] as Record<string, unknown>;
        const id = attrsObj?.['@_id'] as string | undefined;
        if (!id) {
          return;
        }

        const unit = unitMap.get(id);
        if (!unit?.target) {
          return;
        }

        // Find segment element
        const segmentIndex = unitNode.findIndex(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && 'segment' in item
        );

        if (segmentIndex === -1) {
          return;
        }

        const segmentWrapper = unitNode[segmentIndex];
        const segment = segmentWrapper['segment'] as Record<string, unknown>[];
        if (!Array.isArray(segment)) {
          return;
        }

        // Build target content with placeholders restored
        const targetContent = this.buildTargetContent(unit.target, unit.metadata.placeholders);

        // Find or create target in segment
        const targetIndex = segment.findIndex(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && 'target' in item
        );

        if (targetIndex === -1) {
          // Insert target after source
          const sourceIndex = segment.findIndex(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null && 'source' in item
          );

          if (sourceIndex !== -1) {
            segment.splice(sourceIndex + 1, 0, {
              target: targetContent,
            });
          }
        } else {
          // Update existing target
          segment[targetIndex]['target'] = targetContent;
        }

        // Update segment state if requested
        if (options?.markAsTranslated) {
          const segmentAttrs = segment.find(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null && ':@' in item
          );

          if (segmentAttrs) {
            (segmentAttrs[':@'] as Record<string, unknown>)['@_state'] = 'translated';
          } else {
            segment.unshift({ ':@': { '@_state': 'translated' } });
          }
        }
      }
    });
  }

  /**
   * Walk all nodes in parsed XML structure
   */
  private walkNodes(nodes: unknown[], callback: (node: Record<string, unknown>) => void): void {
    for (const node of nodes) {
      if (typeof node !== 'object' || node === null) {
        continue;
      }

      const nodeObj = node as Record<string, unknown>;
      callback(nodeObj);

      // Recurse into child arrays
      for (const value of Object.values(nodeObj)) {
        if (Array.isArray(value)) {
          this.walkNodes(value, callback);
        }
      }
    }
  }

  /**
   * Build target element content with placeholders restored
   * Converts placeholder markers (e.g., {{PH}}) back to XML elements
   */
  private buildTargetContent(
    text: string,
    placeholders?: XliffPlaceholder[]
  ): Array<Record<string, unknown>> {
    // If no placeholders, return simple text node
    if (!placeholders || placeholders.length === 0) {
      return [{ '#text': text }];
    }

    // Create a map of marker -> placeholder for quick lookup
    const placeholderMap = new Map<string, XliffPlaceholder>();
    for (const ph of placeholders) {
      placeholderMap.set(ph.marker, ph);
    }

    // Build regex to match all placeholder markers
    // Escape special regex characters in markers
    const markerPatterns = placeholders.map(ph => ph.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const markerRegex = new RegExp(`(${markerPatterns.join('|')})`, 'g');

    // Split text by placeholders and build content array
    const result: Array<Record<string, unknown>> = [];
    const parts = text.split(markerRegex);

    for (const part of parts) {
      if (!part) {
        continue;
      }

      const placeholder = placeholderMap.get(part);
      if (placeholder) {
        // This is a placeholder marker - restore the XML element
        const element = this.buildPlaceholderElement(placeholder);
        result.push(element);
      } else {
        // This is regular text
        result.push({ '#text': part });
      }
    }

    return result;
  }

  /**
   * Build a placeholder XML element from placeholder metadata
   */
  private buildPlaceholderElement(placeholder: XliffPlaceholder): Record<string, unknown> {
    const { tagName, attributes } = placeholder;

    // Convert attributes to fast-xml-parser format
    const attrObj: Record<string, string> = {};
    for (const [key, value] of Object.entries(attributes)) {
      attrObj[`@_${key}`] = value;
    }

    // Self-closing elements like <x/> have attributes but no content
    // The preserveOrder format uses arrays for element content
    const element: Record<string, unknown> = {
      [tagName]: [{ ':@': attrObj }],
    };

    return element;
  }
}
