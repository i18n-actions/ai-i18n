import * as fs from 'fs';
import * as path from 'path';
import { JsonExtractor, buildNestedJson, flattenJson } from '../../../src/extractors/json';

describe('JsonExtractor', () => {
  let extractor: JsonExtractor;

  beforeEach(() => {
    extractor = new JsonExtractor();
  });

  describe('detect', () => {
    it('should detect flat JSON format', () => {
      const content = `{
        "key1": "value1",
        "key2": "value2"
      }`;

      const result = extractor.detect(content);

      expect(result).not.toBeNull();
      expect(result?.format).toBe('json-flat');
    });

    it('should detect nested JSON format', () => {
      const content = `{
        "section": {
          "key1": "value1",
          "key2": "value2"
        }
      }`;

      const result = extractor.detect(content);

      expect(result).not.toBeNull();
      expect(result?.format).toBe('json-nested');
    });

    it('should return null for invalid JSON', () => {
      const content = `not valid json`;

      const result = extractor.detect(content);

      expect(result).toBeNull();
    });

    it('should return null for array JSON', () => {
      const content = `["item1", "item2"]`;

      const result = extractor.detect(content);

      expect(result).toBeNull();
    });
  });

  describe('extract flat JSON', () => {
    it('should extract translation units from flat JSON file', async () => {
      const fixturePath = path.join(__dirname, '../../fixtures/json-flat/en.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      expect(result.units.length).toBeGreaterThan(0);
      expect(result.formatInfo.format).toBe('json-flat');
    });

    it('should use key as ID for flat JSON', async () => {
      const fixturePath = path.join(__dirname, '../../fixtures/json-flat/en.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const greetingUnit = result.units.find(u => u.id === 'greeting');
      expect(greetingUnit).toBeDefined();
      expect(greetingUnit?.source).toBe('Hello, World!');
    });
  });

  describe('extract nested JSON', () => {
    it('should extract translation units from nested JSON file', async () => {
      const fixturePath = path.join(__dirname, '../../fixtures/json-nested/en.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      expect(result.units.length).toBeGreaterThan(0);
      expect(result.formatInfo.format).toBe('json-nested');
    });

    it('should use dot notation for nested keys', async () => {
      const fixturePath = path.join(__dirname, '../../fixtures/json-nested/en.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const buttonSaveUnit = result.units.find(u => u.id === 'button.save');
      expect(buttonSaveUnit).toBeDefined();
      expect(buttonSaveUnit?.source).toBe('Save changes');
    });

    it('should handle deeply nested keys', async () => {
      const fixturePath = path.join(__dirname, '../../fixtures/json-nested/en.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const deepUnit = result.units.find(u => u.id === 'error.validation.email');
      expect(deepUnit).toBeDefined();
      expect(deepUnit?.source).toBe('Please enter a valid email address');
    });
  });

  describe('supported formats', () => {
    it('should support json-flat format', () => {
      expect(extractor.supportsFormat('json-flat')).toBe(true);
    });

    it('should support json-nested format', () => {
      expect(extractor.supportsFormat('json-nested')).toBe(true);
    });

    it('should not support xliff format', () => {
      expect(extractor.supportsFormat('xliff-1.2')).toBe(false);
    });

    it('should support .json extension', () => {
      expect(extractor.supportsExtension('.json')).toBe(true);
    });
  });
});

describe('JSON utilities', () => {
  describe('buildNestedJson', () => {
    it('should build nested structure from flat entries', () => {
      const entries = [
        { id: 'button.save', value: 'Save' },
        { id: 'button.cancel', value: 'Cancel' },
        { id: 'greeting', value: 'Hello' },
      ];

      const result = buildNestedJson(entries);

      expect(result).toEqual({
        button: {
          save: 'Save',
          cancel: 'Cancel',
        },
        greeting: 'Hello',
      });
    });
  });

  describe('flattenJson', () => {
    it('should flatten nested structure to dot notation', () => {
      const obj = {
        button: {
          save: 'Save',
          cancel: 'Cancel',
        },
        greeting: 'Hello',
      };

      const result = flattenJson(obj);

      expect(result).toEqual([
        { id: 'button.save', value: 'Save' },
        { id: 'button.cancel', value: 'Cancel' },
        { id: 'greeting', value: 'Hello' },
      ]);
    });
  });
});
