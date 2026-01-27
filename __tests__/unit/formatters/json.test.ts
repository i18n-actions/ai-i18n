import { JsonFormatter, createJsonFile, mergeJsonFiles } from '../../../src/formatters/json';
import type { TranslationUnit, ExtractResult } from '../../../src/types/translation';

describe('JsonFormatter', () => {
  let formatter: JsonFormatter;

  beforeEach(() => {
    formatter = new JsonFormatter();
  });

  const createUnit = (id: string, source: string, target?: string): TranslationUnit => ({
    id,
    source,
    target,
    hash: 'hash',
    metadata: { file: 'test.json' },
  });

  const createExtractResult = (
    units: TranslationUnit[],
    format: 'json-flat' | 'json-nested'
  ): ExtractResult => ({
    filePath: 'test.json',
    sourceLanguage: 'en',
    targetLanguage: 'de',
    units,
    formatInfo: { format },
    originalContent: '',
  });

  describe('format flat JSON', () => {
    it('should update translations in flat JSON', async () => {
      const originalContent = `{
  "greeting": "Hello",
  "farewell": "Goodbye"
}`;

      const units = [
        createUnit('greeting', 'Hello'),
        createUnit('farewell', 'Goodbye'),
      ];

      const updatedUnits = [
        createUnit('greeting', 'Hello', 'Hallo'),
        createUnit('farewell', 'Goodbye', 'Auf Wiedersehen'),
      ];

      const extractResult = createExtractResult(units, 'json-flat');
      extractResult.originalContent = originalContent;

      const result = formatter.format(originalContent, updatedUnits, extractResult);

      const parsed = JSON.parse(result.content);
      expect(parsed.greeting).toBe('Hallo');
      expect(parsed.farewell).toBe('Auf Wiedersehen');
    });

    it('should preserve keys without translations', async () => {
      const originalContent = `{
  "greeting": "Hello",
  "farewell": "Goodbye"
}`;

      const units = [
        createUnit('greeting', 'Hello'),
        createUnit('farewell', 'Goodbye'),
      ];

      const updatedUnits = [
        createUnit('greeting', 'Hello', 'Hallo'),
        // farewell not updated
      ];

      const extractResult = createExtractResult(units, 'json-flat');
      extractResult.originalContent = originalContent;

      const result = formatter.format(originalContent, updatedUnits, extractResult);

      const parsed = JSON.parse(result.content);
      expect(parsed.greeting).toBe('Hallo');
      expect(parsed.farewell).toBe('Goodbye'); // Preserved
    });
  });

  describe('format nested JSON', () => {
    it('should update translations in nested JSON', async () => {
      const originalContent = `{
  "button": {
    "save": "Save",
    "cancel": "Cancel"
  }
}`;

      const units = [
        createUnit('button.save', 'Save'),
        createUnit('button.cancel', 'Cancel'),
      ];

      const updatedUnits = [
        createUnit('button.save', 'Save', 'Speichern'),
        createUnit('button.cancel', 'Cancel', 'Abbrechen'),
      ];

      const extractResult = createExtractResult(units, 'json-nested');
      extractResult.originalContent = originalContent;

      const result = formatter.format(originalContent, updatedUnits, extractResult);

      const parsed = JSON.parse(result.content);
      expect(parsed.button.save).toBe('Speichern');
      expect(parsed.button.cancel).toBe('Abbrechen');
    });
  });

  describe('count changes', () => {
    it('should report correct update counts', async () => {
      const originalContent = `{
  "a": "A",
  "b": "B",
  "c": "C"
}`;

      const units = [
        createUnit('a', 'A'),
        createUnit('b', 'B'),
        createUnit('c', 'C'),
      ];

      const updatedUnits = [
        createUnit('a', 'A', 'A-translated'),
        createUnit('b', 'B', 'B-translated'),
        // c not updated
      ];

      const extractResult = createExtractResult(units, 'json-flat');
      extractResult.originalContent = originalContent;

      const result = formatter.format(originalContent, updatedUnits, extractResult);

      expect(result.updatedCount).toBe(2);
      expect(result.unchangedCount).toBe(1);
    });
  });

  describe('supported formats', () => {
    it('should support json-flat', () => {
      expect(formatter.supportsFormat('json-flat')).toBe(true);
    });

    it('should support json-nested', () => {
      expect(formatter.supportsFormat('json-nested')).toBe(true);
    });

    it('should not support xliff', () => {
      expect(formatter.supportsFormat('xliff-1.2')).toBe(false);
    });
  });
});

describe('JSON utilities', () => {
  describe('createJsonFile', () => {
    it('should create flat JSON file', () => {
      const units = [
        { id: 'a', source: 'A', target: 'A-trans', hash: '', metadata: { file: '' } },
        { id: 'b', source: 'B', target: 'B-trans', hash: '', metadata: { file: '' } },
      ];

      const content = createJsonFile(units, false);
      const parsed = JSON.parse(content);

      expect(parsed.a).toBe('A-trans');
      expect(parsed.b).toBe('B-trans');
    });

    it('should create nested JSON file', () => {
      const units = [
        { id: 'button.save', source: 'Save', target: 'Speichern', hash: '', metadata: { file: '' } },
        { id: 'button.cancel', source: 'Cancel', target: 'Abbrechen', hash: '', metadata: { file: '' } },
      ];

      const content = createJsonFile(units, true);
      const parsed = JSON.parse(content);

      expect(parsed.button.save).toBe('Speichern');
      expect(parsed.button.cancel).toBe('Abbrechen');
    });
  });

  describe('mergeJsonFiles', () => {
    it('should merge flat JSON files', () => {
      const base = { a: 'A', b: 'B' };
      const override = { b: 'B-new', c: 'C' };

      const result = mergeJsonFiles(base, override, false);

      expect(result.a).toBe('A');
      expect(result.b).toBe('B-new');
      expect(result.c).toBe('C');
    });

    it('should deep merge nested JSON files', () => {
      const base = {
        button: { save: 'Save', cancel: 'Cancel' },
        title: 'Title',
      };
      const override = {
        button: { cancel: 'Abort' },
        footer: 'Footer',
      };

      const result = mergeJsonFiles(base, override, true);

      expect((result.button as Record<string, string>).save).toBe('Save');
      expect((result.button as Record<string, string>).cancel).toBe('Abort');
      expect(result.title).toBe('Title');
      expect(result.footer).toBe('Footer');
    });
  });
});
