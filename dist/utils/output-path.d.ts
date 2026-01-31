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
export declare function getOutputFilePath(sourcePath: string, targetLanguage: string, sourceLanguage: string): string;
/**
 * Check if a path appears to be a language-specific file.
 *
 * @param filePath - The file path to check
 * @param languageCode - The language code to look for
 * @returns true if the file appears to be language-specific
 */
export declare function isLanguageSpecificPath(filePath: string, languageCode: string): boolean;
//# sourceMappingURL=output-path.d.ts.map