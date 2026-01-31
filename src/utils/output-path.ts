import * as path from 'path';

/**
 * Generate a language-specific output file path.
 *
 * Transforms a source file path to include the target language code.
 * Examples:
 *   - messages.xlf + 'de' → messages.de.xlf
 *   - src/i18n/messages.xlf + 'es' → src/i18n/messages.es.xlf
 *   - locale/en.json + 'fr' → locale/fr.json
 *
 * @param sourcePath - The original source file path
 * @param targetLanguage - The target language code (e.g., 'de', 'es', 'fr')
 * @param sourceLanguage - The source language code (e.g., 'en')
 * @returns The language-specific output file path
 */
export function getOutputFilePath(
  sourcePath: string,
  targetLanguage: string,
  sourceLanguage: string
): string {
  const dir = path.dirname(sourcePath);
  const ext = path.extname(sourcePath);
  const baseName = path.basename(sourcePath, ext);

  // Check if the filename already contains the source language code
  // e.g., "messages.en.xlf" or "en.json"
  const sourcePattern = new RegExp(`[._-]${escapeRegex(sourceLanguage)}$`, 'i');

  if (sourcePattern.test(baseName)) {
    // Replace source language with target language
    // e.g., "messages.en" → "messages.de"
    const newBaseName = baseName.replace(sourcePattern, (match) => {
      // Preserve the separator character (., -, or _)
      const separator = match.charAt(0);
      return `${separator}${targetLanguage}`;
    });
    return path.join(dir, `${newBaseName}${ext}`);
  }

  // Check if the basename is just the source language code
  // e.g., "en.json" → "de.json"
  if (baseName.toLowerCase() === sourceLanguage.toLowerCase()) {
    return path.join(dir, `${targetLanguage}${ext}`);
  }

  // Otherwise, insert the target language before the extension
  // e.g., "messages.xlf" → "messages.de.xlf"
  return path.join(dir, `${baseName}.${targetLanguage}${ext}`);
}

/**
 * Check if a path appears to be a language-specific file.
 *
 * @param filePath - The file path to check
 * @param languageCode - The language code to look for
 * @returns true if the file appears to be language-specific
 */
export function isLanguageSpecificPath(filePath: string, languageCode: string): boolean {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);

  // Check for patterns like "messages.de.xlf", "messages_de.xlf", "messages-de.xlf"
  const pattern = new RegExp(`[._-]${escapeRegex(languageCode)}$`, 'i');
  if (pattern.test(baseName)) {
    return true;
  }

  // Check if the basename is just the language code
  if (baseName.toLowerCase() === languageCode.toLowerCase()) {
    return true;
  }

  return false;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
