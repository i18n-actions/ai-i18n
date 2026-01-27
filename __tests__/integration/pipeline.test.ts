import * as path from 'path';
import { extractFromFile } from '../../src/extractors/factory';
import { diffAgainstStore } from '../../src/differ/differ';
import { createHashStore, addToHashStore } from '../../src/differ/hasher';
import { formatTranslations } from '../../src/formatters/factory';
import type { TranslationUnit } from '../../src/types/translation';

describe('Integration: Translation Pipeline', () => {
  describe('XLIFF 2.0 Pipeline', () => {
    const fixturePath = path.join(__dirname, '../fixtures/xliff-2.0/messages.xliff');

    it('should extract, diff, and format XLIFF 2.0 file', () => {
      const extractResult = extractFromFile(fixturePath, 'fr');

      expect(extractResult.units.length).toBeGreaterThan(0);
      expect(extractResult.formatInfo.format).toBe('xliff-2.0');
      expect(extractResult.sourceLanguage).toBe('en');

      // Create translated units
      const translatedUnits: TranslationUnit[] = extractResult.units.map(unit => ({
        ...unit,
        target: `[FR] ${unit.source}`,
      }));

      // Format back
      const formatResult = formatTranslations(
        extractResult.originalContent,
        translatedUnits,
        extractResult
      );

      expect(formatResult.content).toContain('xliff');
      expect(formatResult.content).toContain('version="2.0"');
    });
  });

  describe('JSON Flat Pipeline', () => {
    const fixturePath = path.join(__dirname, '../fixtures/json-flat/en.json');

    it('should extract, diff, and format flat JSON file', () => {
      const extractResult = extractFromFile(fixturePath, 'de');

      expect(extractResult.units.length).toBeGreaterThan(0);
      expect(extractResult.formatInfo.format).toBe('json-flat');

      // Check for specific keys
      const greetingUnit = extractResult.units.find(u => u.id === 'greeting');
      expect(greetingUnit).toBeDefined();
      expect(greetingUnit?.source).toBe('Hello, World!');

      // Create translated units
      const translatedUnits: TranslationUnit[] = extractResult.units.map(unit => ({
        ...unit,
        target: `[DE] ${unit.source}`,
      }));

      // Format back
      const formatResult = formatTranslations(
        extractResult.originalContent,
        translatedUnits,
        extractResult
      );

      const parsed = JSON.parse(formatResult.content) as { greeting: string };
      expect(parsed.greeting).toBe('[DE] Hello, World!');
    });
  });

  describe('JSON Nested Pipeline', () => {
    const fixturePath = path.join(__dirname, '../fixtures/json-nested/en.json');

    it('should extract, diff, and format nested JSON file', () => {
      const extractResult = extractFromFile(fixturePath, 'de');

      expect(extractResult.units.length).toBeGreaterThan(0);
      expect(extractResult.formatInfo.format).toBe('json-nested');

      // Check for nested keys
      const buttonSaveUnit = extractResult.units.find(u => u.id === 'button.save');
      expect(buttonSaveUnit).toBeDefined();
      expect(buttonSaveUnit?.source).toBe('Save changes');

      // Create translated units
      const translatedUnits: TranslationUnit[] = extractResult.units.map(unit => ({
        ...unit,
        target: `[DE] ${unit.source}`,
      }));

      // Format back
      const formatResult = formatTranslations(
        extractResult.originalContent,
        translatedUnits,
        extractResult
      );

      const parsed = JSON.parse(formatResult.content) as {
        button: { save: string };
        error: { validation: { email: string } };
      };
      expect(parsed.button.save).toBe('[DE] Save changes');
      expect(parsed.error.validation.email).toBe('[DE] Please enter a valid email address');
    });
  });

  describe('ICU Message Handling', () => {
    it('should preserve ICU patterns during extraction', () => {
      const fixturePath = path.join(__dirname, '../fixtures/json-flat/en.json');
      const extractResult = extractFromFile(fixturePath, 'de');

      const pluralUnit = extractResult.units.find(u => u.id === 'items_count');
      expect(pluralUnit).toBeDefined();
      expect(pluralUnit?.source).toContain('{count, plural,');
    });
  });

  describe('Change Detection', () => {
    it('should detect modified strings', () => {
      const fixturePath = path.join(__dirname, '../fixtures/json-flat/en.json');
      const extractResult = extractFromFile(fixturePath, 'de');

      // Add original hashes to store
      const hashStore = createHashStore();
      addToHashStore(hashStore, fixturePath, extractResult.units);

      // Modify a unit's source
      const modifiedUnits = extractResult.units.map(unit => {
        if (unit.id === 'greeting') {
          return { ...unit, source: 'Hello, Universe!', hash: '' };
        }
        return unit;
      });

      // Diff should show one modified
      const diffResult = diffAgainstStore(fixturePath, modifiedUnits, hashStore);

      expect(diffResult.summary.modified).toBe(1);
    });
  });
});
