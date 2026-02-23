import { XliffFormatter } from '../../../src/formatters/xliff';
import { hashContent } from '../../../src/differ/hasher';
import type {
  ExtractResult,
  TranslationUnit,
  XliffPlaceholder,
} from '../../../src/types/translation';

describe('XliffFormatter', () => {
  let formatter: XliffFormatter;

  beforeEach(() => {
    formatter = new XliffFormatter();
  });

  const xliff12Content = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="de" datatype="plaintext" original="messages">
    <body>
      <trans-unit id="greeting">
        <source>Hello, World!</source>
        <target></target>
        <note>A simple greeting message</note>
      </trans-unit>
      <trans-unit id="welcome">
        <source>Welcome to our application</source>
        <target></target>
      </trans-unit>
      <trans-unit id="button.save">
        <source>Save changes</source>
        <target></target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

  const xliff20Content = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" srcLang="en" trgLang="fr" xmlns="urn:oasis:names:tc:xliff:document:2.0">
  <file id="messages">
    <unit id="greeting">
      <segment>
        <source>Hello, World!</source>
        <target></target>
      </segment>
    </unit>
    <unit id="welcome">
      <segment>
        <source>Welcome to our application</source>
        <target></target>
      </segment>
    </unit>
  </file>
</xliff>`;

  function makeExtractResult(
    content: string,
    units: TranslationUnit[],
    format: 'xliff-1.2' | 'xliff-2.0'
  ): ExtractResult {
    return {
      filePath: 'test.xliff',
      sourceLanguage: 'en',
      targetLanguage: format === 'xliff-1.2' ? 'de' : 'fr',
      units,
      formatInfo: { format, version: format === 'xliff-1.2' ? '1.2' : '2.0' },
      originalContent: content,
    };
  }

  function makeUnit(id: string, source: string, target?: string): TranslationUnit {
    return { id, source, target, hash: hashContent(source), metadata: { file: 'test.xliff' } };
  }

  describe('round-trip preserves formatting', () => {
    it('should not change the file when no units are updated (XLIFF 1.2)', () => {
      const originalUnits = [
        makeUnit('greeting', 'Hello, World!'),
        makeUnit('welcome', 'Welcome to our application'),
        makeUnit('button.save', 'Save changes'),
      ];
      const extractResult = makeExtractResult(xliff12Content, originalUnits, 'xliff-1.2');

      // Pass the same units with no target changes
      const result = formatter.format(xliff12Content, originalUnits, extractResult);

      expect(result.content).toBe(xliff12Content);
      expect(result.updatedCount).toBe(0);
    });

    it('should not change the file when no units are updated (XLIFF 2.0)', () => {
      const originalUnits = [
        makeUnit('greeting', 'Hello, World!'),
        makeUnit('welcome', 'Welcome to our application'),
      ];
      const extractResult = makeExtractResult(xliff20Content, originalUnits, 'xliff-2.0');

      const result = formatter.format(xliff20Content, originalUnits, extractResult);

      expect(result.content).toBe(xliff20Content);
      expect(result.updatedCount).toBe(0);
    });
  });

  describe('targeted replacement (XLIFF 1.2)', () => {
    it('should only modify the target of updated units', () => {
      const originalUnits = [
        makeUnit('greeting', 'Hello, World!'),
        makeUnit('welcome', 'Welcome to our application'),
        makeUnit('button.save', 'Save changes'),
      ];
      const extractResult = makeExtractResult(xliff12Content, originalUnits, 'xliff-1.2');

      // Only update greeting
      const updatedUnits = [
        makeUnit('greeting', 'Hello, World!', 'Hallo, Welt!'),
        makeUnit('welcome', 'Welcome to our application'),
        makeUnit('button.save', 'Save changes'),
      ];

      const result = formatter.format(xliff12Content, updatedUnits, extractResult);

      // greeting target should be updated
      expect(result.content).toContain('<target>Hallo, Welt!</target>');
      // Other units should remain exactly as before (empty targets)
      expect(result.content).toMatch(
        /<trans-unit id="welcome">[\s\S]*?<target><\/target>[\s\S]*?<\/trans-unit>/
      );
      expect(result.content).toMatch(
        /<trans-unit id="button.save">[\s\S]*?<target><\/target>[\s\S]*?<\/trans-unit>/
      );
      // XML declaration and structure preserved
      expect(result.content.startsWith('<?xml version="1.0"')).toBe(true);
      expect(result.content).toContain('xmlns="urn:oasis:names:tc:xliff:document:1.2"');
    });

    it('should support markAsTranslated option', () => {
      const originalUnits = [makeUnit('greeting', 'Hello, World!')];
      const extractResult = makeExtractResult(xliff12Content, originalUnits, 'xliff-1.2');
      const updatedUnits = [makeUnit('greeting', 'Hello, World!', 'Hallo, Welt!')];

      const result = formatter.format(xliff12Content, updatedUnits, extractResult, {
        markAsTranslated: true,
      });

      expect(result.content).toContain('<target state="translated">Hallo, Welt!</target>');
    });

    it('should insert target after source when no target exists', () => {
      const noTargetContent = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="de" datatype="plaintext" original="messages">
    <body>
      <trans-unit id="greeting">
        <source>Hello, World!</source>
        <note>A greeting</note>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const originalUnits = [makeUnit('greeting', 'Hello, World!')];
      const extractResult = makeExtractResult(noTargetContent, originalUnits, 'xliff-1.2');
      const updatedUnits = [makeUnit('greeting', 'Hello, World!', 'Hallo, Welt!')];

      const result = formatter.format(noTargetContent, updatedUnits, extractResult);

      expect(result.content).toContain('<target>Hallo, Welt!</target>');
      // Target should be after source
      const sourceIdx = result.content.indexOf('</source>');
      const targetIdx = result.content.indexOf('<target>');
      expect(targetIdx).toBeGreaterThan(sourceIdx);
    });

    it('should escape XML special characters in translations', () => {
      const originalUnits = [makeUnit('greeting', 'Hello, World!')];
      const extractResult = makeExtractResult(xliff12Content, originalUnits, 'xliff-1.2');
      const updatedUnits = [makeUnit('greeting', 'Hello, World!', 'Use <b>bold</b> & "quotes"')];

      const result = formatter.format(xliff12Content, updatedUnits, extractResult);

      expect(result.content).toContain(
        '<target>Use &lt;b&gt;bold&lt;/b&gt; &amp; "quotes"</target>'
      );
    });
  });

  describe('targeted replacement (XLIFF 2.0)', () => {
    it('should only modify the target of updated units', () => {
      const originalUnits = [
        makeUnit('greeting', 'Hello, World!'),
        makeUnit('welcome', 'Welcome to our application'),
      ];
      const extractResult = makeExtractResult(xliff20Content, originalUnits, 'xliff-2.0');

      const updatedUnits = [
        makeUnit('greeting', 'Hello, World!', 'Bonjour, le monde!'),
        makeUnit('welcome', 'Welcome to our application'),
      ];

      const result = formatter.format(xliff20Content, updatedUnits, extractResult);

      expect(result.content).toContain('<target>Bonjour, le monde!</target>');
      // welcome should remain unchanged
      expect(result.content).toMatch(
        /<unit id="welcome">[\s\S]*?<target><\/target>[\s\S]*?<\/unit>/
      );
    });
  });

  describe('placeholder handling', () => {
    it('should restore placeholders in target XML', () => {
      const placeholders: XliffPlaceholder[] = [
        {
          marker: '{{INTERPOLATION}}',
          tagName: 'x',
          attributes: { id: 'INTERPOLATION', 'equiv-text': '{{name}}' },
        },
      ];

      const originalUnits: TranslationUnit[] = [
        {
          id: 'greeting',
          source: 'Hello, {{INTERPOLATION}}!',
          hash: hashContent('Hello, {{INTERPOLATION}}!'),
          metadata: { file: 'test.xliff', placeholders },
        },
      ];

      const extractResult = makeExtractResult(xliff12Content, originalUnits, 'xliff-1.2');

      const updatedUnits: TranslationUnit[] = [
        {
          id: 'greeting',
          source: 'Hello, {{INTERPOLATION}}!',
          target: 'Hallo, {{INTERPOLATION}}!',
          hash: hashContent('Hello, {{INTERPOLATION}}!'),
          metadata: { file: 'test.xliff', placeholders },
        },
      ];

      const result = formatter.format(xliff12Content, updatedUnits, extractResult);

      expect(result.content).toContain(
        '<target>Hallo, <x id="INTERPOLATION" equiv-text="{{name}}"/>!</target>'
      );
    });
  });

  describe('placeholder spacing repair', () => {
    it('should insert missing spaces around placeholders based on source', () => {
      const placeholders: XliffPlaceholder[] = [
        {
          marker: '{{PH}}',
          tagName: 'x',
          attributes: { id: 'PH', 'equiv-text': '{{count}}' },
        },
      ];

      const originalUnits: TranslationUnit[] = [
        {
          id: 'greeting',
          source: 'Showing {{PH}} of',
          hash: hashContent('Showing {{PH}} of'),
          metadata: { file: 'test.xliff', placeholders },
        },
      ];

      const extractResult = makeExtractResult(xliff12Content, originalUnits, 'xliff-1.2');

      // LLM dropped spaces around the placeholder
      const updatedUnits: TranslationUnit[] = [
        {
          id: 'greeting',
          source: 'Showing {{PH}} of',
          target: 'Mostrando{{PH}}de',
          hash: hashContent('Showing {{PH}} of'),
          metadata: { file: 'test.xliff', placeholders },
        },
      ];

      const result = formatter.format(xliff12Content, updatedUnits, extractResult);

      expect(result.content).toContain(
        '<target>Mostrando <x id="PH" equiv-text="{{count}}"/> de</target>'
      );
    });

    it('should not add spaces when source has no spaces around placeholder', () => {
      const placeholders: XliffPlaceholder[] = [
        {
          marker: '{{PH}}',
          tagName: 'x',
          attributes: { id: 'PH', 'equiv-text': '{{name}}' },
        },
      ];

      const originalUnits: TranslationUnit[] = [
        {
          id: 'greeting',
          source: 'Hello,{{PH}}!',
          hash: hashContent('Hello,{{PH}}!'),
          metadata: { file: 'test.xliff', placeholders },
        },
      ];

      const extractResult = makeExtractResult(xliff12Content, originalUnits, 'xliff-1.2');

      const updatedUnits: TranslationUnit[] = [
        {
          id: 'greeting',
          source: 'Hello,{{PH}}!',
          target: 'Hallo,{{PH}}!',
          hash: hashContent('Hello,{{PH}}!'),
          metadata: { file: 'test.xliff', placeholders },
        },
      ];

      const result = formatter.format(xliff12Content, updatedUnits, extractResult);

      expect(result.content).toContain(
        '<target>Hallo,<x id="PH" equiv-text="{{name}}"/>!</target>'
      );
    });

    it('should preserve existing spaces in translation when source has them', () => {
      const placeholders: XliffPlaceholder[] = [
        {
          marker: '{{PH}}',
          tagName: 'x',
          attributes: { id: 'PH', 'equiv-text': '{{count}}' },
        },
      ];

      const originalUnits: TranslationUnit[] = [
        {
          id: 'greeting',
          source: 'Showing {{PH}} items',
          hash: hashContent('Showing {{PH}} items'),
          metadata: { file: 'test.xliff', placeholders },
        },
      ];

      const extractResult = makeExtractResult(xliff12Content, originalUnits, 'xliff-1.2');

      // Translation already has correct spaces
      const updatedUnits: TranslationUnit[] = [
        {
          id: 'greeting',
          source: 'Showing {{PH}} items',
          target: 'Mostrando {{PH}} elementos',
          hash: hashContent('Showing {{PH}} items'),
          metadata: { file: 'test.xliff', placeholders },
        },
      ];

      const result = formatter.format(xliff12Content, updatedUnits, extractResult);

      expect(result.content).toContain(
        '<target>Mostrando <x id="PH" equiv-text="{{count}}"/> elementos</target>'
      );
    });
  });

  describe('diff minimization', () => {
    it('should produce identical output when re-formatting already-translated content', () => {
      const translatedContent = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="de" datatype="plaintext" original="messages">
    <body>
      <trans-unit id="greeting">
        <source>Hello, World!</source>
        <target state="translated">Hallo, Welt!</target>
        <note>A simple greeting message</note>
      </trans-unit>
      <trans-unit id="welcome">
        <source>Welcome to our application</source>
        <target state="translated">Willkommen in unserer Anwendung</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const originalUnits = [
        makeUnit('greeting', 'Hello, World!', 'Hallo, Welt!'),
        makeUnit('welcome', 'Welcome to our application', 'Willkommen in unserer Anwendung'),
      ];
      const extractResult = makeExtractResult(translatedContent, originalUnits, 'xliff-1.2');

      // Re-format with the same translations (simulating no-change run)
      const result = formatter.format(translatedContent, originalUnits, extractResult);

      expect(result.content).toBe(translatedContent);
      expect(result.updatedCount).toBe(0);
    });
  });
});
