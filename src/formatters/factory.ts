import * as fs from 'fs';
import * as path from 'path';
import { FormatterError } from '../utils/errors';
import { logger } from '../utils/logger';
import type {
  ExtractResult,
  FormatResult,
  TranslationUnit,
  FormatInfo,
} from '../types/translation';
import { BaseFormatter, FormatterRegistry, FormatOptions } from './base';
import { XliffFormatter } from './xliff';
import { JsonFormatter } from './json';

/**
 * Create and configure the formatter registry with all available formatters
 */
export function createFormatterRegistry(): FormatterRegistry {
  const registry = new FormatterRegistry();

  registry.register(new XliffFormatter());
  registry.register(new JsonFormatter());

  return registry;
}

// Default registry instance
const defaultRegistry = createFormatterRegistry();

/**
 * Get a formatter for a specific format
 */
export function getFormatter(format: FormatInfo['format']): BaseFormatter {
  const formatter = defaultRegistry.getByFormat(format);

  if (!formatter) {
    throw new FormatterError(`No formatter found for format: ${format}`, format);
  }

  return formatter;
}

/**
 * Get a formatter by file extension
 */
export function getFormatterByExtension(extension: string): BaseFormatter | undefined {
  return defaultRegistry.getByExtension(extension);
}

/**
 * Format translated units and return the new content
 */
export function formatTranslations(
  originalContent: string,
  updatedUnits: TranslationUnit[],
  extractResult: ExtractResult,
  options?: FormatOptions
): FormatResult {
  const formatter = getFormatter(extractResult.formatInfo.format);

  logger.debug(
    `Formatting ${updatedUnits.length} units with ${extractResult.formatInfo.format} formatter`
  );

  return formatter.format(originalContent, updatedUnits, extractResult, options);
}

/**
 * Write formatted translations to a file
 */
export function writeTranslations(
  filePath: string,
  originalContent: string,
  updatedUnits: TranslationUnit[],
  extractResult: ExtractResult,
  options?: FormatOptions & { createBackup?: boolean }
): FormatResult {
  const absolutePath = path.resolve(filePath);

  // Create backup if requested
  if (options?.createBackup && fs.existsSync(absolutePath)) {
    const backupPath = `${absolutePath}.bak`;
    fs.copyFileSync(absolutePath, backupPath);
    logger.debug(`Created backup at ${backupPath}`);
  }

  // Format content
  const result = formatTranslations(originalContent, updatedUnits, extractResult, options);

  // Write to file
  fs.writeFileSync(absolutePath, result.content, 'utf-8');

  logger.info(`Wrote ${result.updatedCount} updated translations to ${filePath}`);

  return result;
}

/**
 * Create a new translation file from units
 */
export function createTranslationFile(
  filePath: string,
  units: TranslationUnit[],
  format: FormatInfo['format'],
  sourceLanguage: string,
  targetLanguage: string,
  options?: FormatOptions
): void {
  const absolutePath = path.resolve(filePath);
  const dir = path.dirname(absolutePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create appropriate content based on format
  let content: string;

  switch (format) {
    case 'json-flat':
      content = createFlatJson(units, options);
      break;

    case 'json-nested':
      content = createNestedJson(units, options);
      break;

    case 'xliff-1.2':
      content = createXliff12(units, sourceLanguage, targetLanguage, options);
      break;

    case 'xliff-2.0':
      content = createXliff20(units, sourceLanguage, targetLanguage, options);
      break;

    default: {
      const exhaustiveCheck: never = format;
      throw new FormatterError(`Cannot create file for format: ${String(exhaustiveCheck)}`, format);
    }
  }

  fs.writeFileSync(absolutePath, content, 'utf-8');
  logger.info(`Created translation file: ${filePath}`);
}

/**
 * Create flat JSON content
 */
function createFlatJson(units: TranslationUnit[], options?: FormatOptions): string {
  const obj: Record<string, string> = {};

  for (const unit of units) {
    obj[unit.id] = unit.target ?? '';
  }

  const indent = options?.indent ?? '  ';
  return JSON.stringify(obj, null, indent) + '\n';
}

/**
 * Create nested JSON content
 */
function createNestedJson(units: TranslationUnit[], options?: FormatOptions): string {
  const obj: Record<string, unknown> = {};

  for (const unit of units) {
    setNestedValue(obj, unit.id, unit.target ?? '');
  }

  const indent = options?.indent ?? '  ';
  return JSON.stringify(obj, null, indent) + '\n';
}

/**
 * Set a value in a nested object using dot notation
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
 * Create XLIFF 1.2 content
 */
function createXliff12(
  units: TranslationUnit[],
  sourceLanguage: string,
  targetLanguage: string,
  _options?: FormatOptions
): string {
  const transUnits = units
    .map(
      unit => `
      <trans-unit id="${escapeXml(unit.id)}">
        <source>${escapeXml(unit.source)}</source>
        <target>${escapeXml(unit.target ?? '')}</target>
      </trans-unit>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="${sourceLanguage}" target-language="${targetLanguage}" datatype="plaintext" original="messages">
    <body>${transUnits}
    </body>
  </file>
</xliff>
`;
}

/**
 * Create XLIFF 2.0 content
 */
function createXliff20(
  units: TranslationUnit[],
  sourceLanguage: string,
  targetLanguage: string,
  _options?: FormatOptions
): string {
  const unitElements = units
    .map(
      unit => `
    <unit id="${escapeXml(unit.id)}">
      <segment>
        <source>${escapeXml(unit.source)}</source>
        <target>${escapeXml(unit.target ?? '')}</target>
      </segment>
    </unit>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" srcLang="${sourceLanguage}" trgLang="${targetLanguage}" xmlns="urn:oasis:names:tc:xliff:document:2.0">
  <file id="messages">${unitElements}
  </file>
</xliff>
`;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get all supported formats
 */
export function getSupportedFormats(): FormatInfo['format'][] {
  const formats = new Set<FormatInfo['format']>();
  for (const formatter of defaultRegistry.getAll()) {
    for (const format of formatter.supportedFormats) {
      formats.add(format);
    }
  }
  return Array.from(formats);
}
