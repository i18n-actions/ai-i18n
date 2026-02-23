import { FormatterError } from '../utils/errors';
import { logger } from '../utils/logger';
import type {
  ExtractResult,
  FormatResult,
  TranslationUnit,
  FormatInfo,
  XliffPlaceholder,
} from '../types/translation';
import { BaseFormatter, FormatOptions, countChanges } from './base';

/**
 * XLIFF formatter for 1.2 and 2.0 formats
 *
 * Uses targeted string replacement instead of full XML rebuild
 * to preserve original file formatting and minimize diffs.
 */
export class XliffFormatter extends BaseFormatter {
  readonly supportedFormats: FormatInfo['format'][] = ['xliff-1.2', 'xliff-2.0'];
  readonly fileExtensions = ['.xliff', '.xlf', '.xml'];

  /**
   * Format XLIFF content with updated translations
   *
   * Only modifies <target> elements for units that changed,
   * preserving the rest of the file byte-for-byte.
   */
  format(
    originalContent: string,
    updatedUnits: TranslationUnit[],
    extractResult: ExtractResult,
    options?: FormatOptions
  ): FormatResult {
    try {
      const changes = countChanges(extractResult.units, updatedUnits);

      // Build map: only units whose target actually changed
      const originalMap = new Map(extractResult.units.map(u => [u.id, u]));
      const unitsToUpdate: TranslationUnit[] = [];
      for (const unit of updatedUnits) {
        if (!unit.target) {
          continue;
        }
        const original = originalMap.get(unit.id);
        if (!original || unit.target !== original.target) {
          unitsToUpdate.push(unit);
        }
      }

      logger.info(
        `XLIFF formatter: ${unitsToUpdate.length} units to patch ` +
          `(${updatedUnits.length} total, ${changes.updated} changed)`
      );

      const unitTag = extractResult.formatInfo.format === 'xliff-2.0' ? 'unit' : 'trans-unit';

      let content = originalContent;
      let patchedCount = 0;

      for (const unit of unitsToUpdate) {
        const targetXml = this.buildTargetXmlString(
          unit.target!,
          unit.metadata.placeholders,
          options
        );
        const patched = this.patchUnit(content, unit.id, targetXml, unitTag);
        if (patched !== null) {
          content = patched;
          patchedCount++;
        }
      }

      logger.info(`XLIFF formatter: patched ${patchedCount} units in-place`);

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
   * Patch a single trans-unit/unit in the XML string by replacing or inserting its <target>.
   * Returns the patched string or null if the unit was not found.
   */
  private patchUnit(
    content: string,
    unitId: string,
    targetXml: string,
    unitTag: string
  ): string | null {
    const escapedId = unitId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match the unit block: <trans-unit id="...">...</trans-unit>
    const unitRegex = new RegExp(
      `(<${unitTag}\\s[^>]*?id="${escapedId}"[^>]*>)([\\s\\S]*?)(<\\/${unitTag}>)`
    );

    const match = unitRegex.exec(content);
    if (!match) {
      logger.debug(`Unit ${unitId} not found in XML content`);
      return null;
    }

    const unitContent = match[2];

    // Detect indentation from the <source> element
    const sourceIndentMatch = unitContent.match(/(\n[ \t]*)<source/);
    const indent = sourceIndentMatch ? sourceIndentMatch[1] : '\n        ';

    // Try to find existing <target ...>...</target> or <target .../> (self-closing)
    const targetRegex = /<target\b[^>]*(?:\/>|>[\s\S]*?<\/target>)/;
    const targetMatch = unitContent.match(targetRegex);

    let newUnitContent: string;

    if (targetMatch) {
      // Replace existing target element
      newUnitContent = unitContent.replace(targetRegex, targetXml);
    } else {
      // Insert target after </source>
      newUnitContent = unitContent.replace(/(<\/source>)/, `$1${indent}${targetXml}`);
    }

    // Reconstruct full match
    const newFullMatch = match[1] + newUnitContent + match[3];
    return (
      content.substring(0, match.index) +
      newFullMatch +
      content.substring(match.index + match[0].length)
    );
  }

  /**
   * Build a <target>...</target> XML string with placeholders restored
   */
  private buildTargetXmlString(
    text: string,
    placeholders?: XliffPlaceholder[],
    options?: FormatOptions
  ): string {
    const stateAttr = options?.markAsTranslated ? ' state="translated"' : '';

    if (!placeholders || placeholders.length === 0) {
      return `<target${stateAttr}>${this.escapeXml(text)}</target>`;
    }

    // Build content with placeholder XML elements restored
    const placeholderMap = new Map(placeholders.map(ph => [ph.marker, ph]));
    const markerPatterns = placeholders.map(ph => ph.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const markerRegex = new RegExp(`(${markerPatterns.join('|')})`, 'g');

    const parts = text.split(markerRegex);
    let innerXml = '';

    for (const part of parts) {
      if (!part) {
        continue;
      }
      const ph = placeholderMap.get(part);
      if (ph) {
        innerXml += this.buildPlaceholderXmlString(ph);
      } else {
        innerXml += this.escapeXml(part);
      }
    }

    return `<target${stateAttr}>${innerXml}</target>`;
  }

  /**
   * Build a self-closing XML element string from placeholder metadata
   */
  private buildPlaceholderXmlString(placeholder: XliffPlaceholder): string {
    const { tagName, attributes } = placeholder;
    const attrs = Object.entries(attributes)
      .map(([key, value]) => `${key}="${this.escapeXmlAttr(value)}"`)
      .join(' ');
    return attrs ? `<${tagName} ${attrs}/>` : `<${tagName}/>`;
  }

  /**
   * Escape text content for XML
   */
  private escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Escape attribute value for XML
   */
  private escapeXmlAttr(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
