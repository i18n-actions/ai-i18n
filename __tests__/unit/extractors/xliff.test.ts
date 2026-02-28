import * as fs from 'fs';
import * as path from 'path';
import { XliffExtractor } from '../../../src/extractors/xliff';

describe('XliffExtractor', () => {
  let extractor: XliffExtractor;

  beforeEach(() => {
    extractor = new XliffExtractor();
  });

  describe('detect', () => {
    it('should detect XLIFF 1.2 format', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="de">
    <body></body>
  </file>
</xliff>`;

      const result = extractor.detect(content);

      expect(result).not.toBeNull();
      expect(result?.format).toBe('xliff-1.2');
    });

    it('should detect XLIFF 2.0 format', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" srcLang="en" trgLang="de" xmlns="urn:oasis:names:tc:xliff:document:2.0">
  <file id="messages"></file>
</xliff>`;

      const result = extractor.detect(content);

      expect(result).not.toBeNull();
      expect(result?.format).toBe('xliff-2.0');
    });

    it('should return null for non-XLIFF content', () => {
      const content = `{"key": "value"}`;

      const result = extractor.detect(content);

      expect(result).toBeNull();
    });
  });

  describe('extract XLIFF 1.2', () => {
    it('should extract translation units from XLIFF 1.2 file', async () => {
      const fixturePath = path.join(__dirname, '../../fixtures/xliff-1.2/messages.xliff');
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      expect(result.units.length).toBeGreaterThan(0);
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('de');
      expect(result.formatInfo.format).toBe('xliff-1.2');
    });

    it('should extract unit with note', async () => {
      const fixturePath = path.join(__dirname, '../../fixtures/xliff-1.2/messages.xliff');
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const greetingUnit = result.units.find(u => u.id === 'greeting');
      expect(greetingUnit).toBeDefined();
      expect(greetingUnit?.metadata.notes).toContain('A simple greeting message');
    });

    it('should extract ICU plural message', async () => {
      const fixturePath = path.join(__dirname, '../../fixtures/xliff-1.2/messages.xliff');
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const pluralUnit = result.units.find(u => u.id === 'items_count');
      expect(pluralUnit).toBeDefined();
      expect(pluralUnit?.source).toContain('{count, plural,');
    });
  });

  describe('extract XLIFF 2.0', () => {
    it('should extract translation units from XLIFF 2.0 file', async () => {
      const fixturePath = path.join(__dirname, '../../fixtures/xliff-2.0/messages.xliff');
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'fr');

      expect(result.units.length).toBeGreaterThan(0);
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('fr');
      expect(result.formatInfo.format).toBe('xliff-2.0');
    });
  });

  describe('extract XLIFF 1.2 with inline elements', () => {
    it('should extract <x> inline elements as {{marker}} placeholders', () => {
      const fixturePath = path.join(
        __dirname,
        '../../fixtures/xliff-1.2/messages-with-placeholders.xliff'
      );
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const simplePh = result.units.find(u => u.id === 'simple_ph');
      expect(simplePh).toBeDefined();
      expect(simplePh?.source).toBe('Click {{PH}} to continue');
      expect(simplePh?.metadata.placeholders).toBeDefined();
      expect(simplePh?.metadata.placeholders).toHaveLength(1);
      expect(simplePh?.metadata.placeholders![0].marker).toBe('{{PH}}');
      expect(simplePh?.metadata.placeholders![0].tagName).toBe('x');
      expect(simplePh?.metadata.placeholders![0].attributes.id).toBe('PH');
    });

    it('should extract INTERPOLATION placeholder with metadata', () => {
      const fixturePath = path.join(
        __dirname,
        '../../fixtures/xliff-1.2/messages-with-placeholders.xliff'
      );
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const interpUnit = result.units.find(u => u.id === 'interpolation');
      expect(interpUnit).toBeDefined();
      expect(interpUnit?.source).toBe('Hello {{INTERPOLATION}}, welcome!');
      expect(interpUnit?.metadata.placeholders).toHaveLength(1);
      expect(interpUnit?.metadata.placeholders![0].tagName).toBe('x');
    });

    it('should extract multiple inline elements as separate placeholders', () => {
      const fixturePath = path.join(
        __dirname,
        '../../fixtures/xliff-1.2/messages-with-placeholders.xliff'
      );
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const multiUnit = result.units.find(u => u.id === 'multiple_ph');
      expect(multiUnit).toBeDefined();
      expect(multiUnit?.source).toContain('{{START_TAG_SPAN}}');
      expect(multiUnit?.source).toContain('{{CLOSE_TAG_SPAN}}');
      expect(multiUnit?.metadata.placeholders).toBeDefined();
      expect(multiUnit?.metadata.placeholders!.length).toBe(4);
    });

    it('should handle units without inline elements normally', () => {
      const fixturePath = path.join(
        __dirname,
        '../../fixtures/xliff-1.2/messages-with-placeholders.xliff'
      );
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const plainUnit = result.units.find(u => u.id === 'no_placeholders');
      expect(plainUnit).toBeDefined();
      expect(plainUnit?.source).toBe('Simple text without placeholders');
      expect(plainUnit?.metadata.placeholders).toBeUndefined();
    });

    it('should extract placeholders from existing targets', () => {
      const fixturePath = path.join(
        __dirname,
        '../../fixtures/xliff-1.2/messages-with-placeholders.xliff'
      );
      const content = fs.readFileSync(fixturePath, 'utf-8');

      const result = extractor.extract(fixturePath, content, 'de');

      const targetUnit = result.units.find(u => u.id === 'with_existing_target');
      expect(targetUnit).toBeDefined();
      expect(targetUnit?.target).toContain('{{PH}}');
      expect(targetUnit?.source).toBe('Update {{PH}} now');
    });
  });

  describe('supported formats', () => {
    it('should support xliff-1.2 format', () => {
      expect(extractor.supportsFormat('xliff-1.2')).toBe(true);
    });

    it('should support xliff-2.0 format', () => {
      expect(extractor.supportsFormat('xliff-2.0')).toBe(true);
    });

    it('should not support json format', () => {
      expect(extractor.supportsFormat('json-flat')).toBe(false);
    });

    it('should support .xliff extension', () => {
      expect(extractor.supportsExtension('.xliff')).toBe(true);
    });

    it('should support .xlf extension', () => {
      expect(extractor.supportsExtension('.xlf')).toBe(true);
    });
  });
});
