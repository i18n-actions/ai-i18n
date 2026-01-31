import { getOutputFilePath, isLanguageSpecificPath } from '../../../src/utils/output-path';

describe('Output Path Utilities', () => {
  describe('getOutputFilePath', () => {
    it('should insert target language before extension for simple files', () => {
      expect(getOutputFilePath('messages.xlf', 'de', 'en')).toBe('messages.de.xlf');
      expect(getOutputFilePath('messages.xlf', 'es', 'en')).toBe('messages.es.xlf');
      expect(getOutputFilePath('messages.xlf', 'fr', 'en')).toBe('messages.fr.xlf');
    });

    it('should handle paths with directories', () => {
      expect(getOutputFilePath('src/i18n/messages.xlf', 'de', 'en')).toBe('src/i18n/messages.de.xlf');
      expect(getOutputFilePath('apps/central/src/i18n/messages.xlf', 'es', 'en')).toBe(
        'apps/central/src/i18n/messages.es.xlf'
      );
    });

    it('should replace source language code in filename with target', () => {
      expect(getOutputFilePath('messages.en.xlf', 'de', 'en')).toBe('messages.de.xlf');
      expect(getOutputFilePath('messages.en.json', 'fr', 'en')).toBe('messages.fr.json');
    });

    it('should handle underscore separator for language code', () => {
      expect(getOutputFilePath('messages_en.xlf', 'de', 'en')).toBe('messages_de.xlf');
    });

    it('should handle hyphen separator for language code', () => {
      expect(getOutputFilePath('messages-en.xlf', 'de', 'en')).toBe('messages-de.xlf');
    });

    it('should handle file that is just the language code', () => {
      expect(getOutputFilePath('en.json', 'de', 'en')).toBe('de.json');
      expect(getOutputFilePath('locale/en.json', 'fr', 'en')).toBe('locale/fr.json');
    });

    it('should handle different file extensions', () => {
      expect(getOutputFilePath('messages.json', 'de', 'en')).toBe('messages.de.json');
      expect(getOutputFilePath('strings.xml', 'es', 'en')).toBe('strings.es.xml');
    });

    it('should be case-insensitive for source language matching', () => {
      expect(getOutputFilePath('messages.EN.xlf', 'de', 'en')).toBe('messages.de.xlf');
      expect(getOutputFilePath('EN.json', 'de', 'en')).toBe('de.json');
    });

    it('should not modify filenames that do not contain source language', () => {
      expect(getOutputFilePath('translations.xlf', 'de', 'en')).toBe('translations.de.xlf');
      expect(getOutputFilePath('app.xlf', 'fr', 'en')).toBe('app.fr.xlf');
    });
  });

  describe('isLanguageSpecificPath', () => {
    it('should return true for files with language code before extension', () => {
      expect(isLanguageSpecificPath('messages.de.xlf', 'de')).toBe(true);
      expect(isLanguageSpecificPath('messages.en.json', 'en')).toBe(true);
    });

    it('should return true for files with underscore separator', () => {
      expect(isLanguageSpecificPath('messages_de.xlf', 'de')).toBe(true);
    });

    it('should return true for files with hyphen separator', () => {
      expect(isLanguageSpecificPath('messages-de.xlf', 'de')).toBe(true);
    });

    it('should return true for files named as language code', () => {
      expect(isLanguageSpecificPath('de.json', 'de')).toBe(true);
      expect(isLanguageSpecificPath('locale/en.json', 'en')).toBe(true);
    });

    it('should return false for files without language code', () => {
      expect(isLanguageSpecificPath('messages.xlf', 'de')).toBe(false);
      expect(isLanguageSpecificPath('translations.json', 'en')).toBe(false);
    });

    it('should return false for different language codes', () => {
      expect(isLanguageSpecificPath('messages.de.xlf', 'fr')).toBe(false);
      expect(isLanguageSpecificPath('en.json', 'de')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isLanguageSpecificPath('messages.DE.xlf', 'de')).toBe(true);
      expect(isLanguageSpecificPath('messages.de.xlf', 'DE')).toBe(true);
    });
  });
});
