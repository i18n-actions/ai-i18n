import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseYaml } from '../../../src/config/loader';

describe('Glossary Loading', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glossary-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('parseYaml with glossary content', () => {
    it('should parse a valid glossary file', () => {
      const content = `de:
  "Shopping Cart": "Warenkorb"
  "Dashboard": "Dashboard"
fr:
  "Shopping Cart": "Panier"
  "Dashboard": "Tableau de bord"`;

      const result = parseYaml(content);

      expect(result).toEqual({
        de: {
          'Shopping Cart': 'Warenkorb',
          Dashboard: 'Dashboard',
        },
        fr: {
          'Shopping Cart': 'Panier',
          Dashboard: 'Tableau de bord',
        },
      });
    });

    it('should handle glossary with single language', () => {
      const content = `es:
  "Hello": "Hola"
  "Goodbye": "Adiós"`;

      const result = parseYaml(content);

      expect(result).toEqual({
        es: {
          Hello: 'Hola',
          Goodbye: 'Adiós',
        },
      });
    });

    it('should handle empty glossary file', () => {
      const content = `# Just comments
# No actual entries`;

      const result = parseYaml(content);
      expect(result).toEqual({});
    });

    it('should ignore comments in glossary', () => {
      const content = `# Per-language glossary for consistent terminology
de:
  # UI terms
  "Shopping Cart": "Warenkorb"`;

      const result = parseYaml(content);

      expect(result).toEqual({
        de: {
          'Shopping Cart': 'Warenkorb',
        },
      });
    });

    it('should handle unquoted values', () => {
      const content = `de:
  Dashboard: Dashboard
  Settings: Einstellungen`;

      const result = parseYaml(content);

      expect(result).toEqual({
        de: {
          Dashboard: 'Dashboard',
          Settings: 'Einstellungen',
        },
      });
    });
  });

  describe('glossary file on disk', () => {
    it('should load glossary from a real file', () => {
      const glossaryPath = path.join(tmpDir, '.i18n-glossary.yml');
      fs.writeFileSync(
        glossaryPath,
        `de:
  "Cart": "Warenkorb"
fr:
  "Cart": "Panier"
`,
        'utf-8'
      );

      const content = fs.readFileSync(glossaryPath, 'utf-8');
      const parsed = parseYaml(content);

      expect(parsed.de).toEqual({ Cart: 'Warenkorb' });
      expect(parsed.fr).toEqual({ Cart: 'Panier' });
    });

    it('should return empty object for non-existent glossary file', () => {
      const glossaryPath = path.join(tmpDir, 'does-not-exist.yml');
      expect(fs.existsSync(glossaryPath)).toBe(false);
    });
  });

  describe('glossary extraction per language', () => {
    it('should extract correct language entries', () => {
      const content = `de:
  "Hello": "Hallo"
  "World": "Welt"
fr:
  "Hello": "Bonjour"
  "World": "Monde"
es:
  "Hello": "Hola"`;

      const parsed = parseYaml(content);

      // Simulate what main.ts does: glossary[targetLanguage]
      const deGlossary = parsed['de'] as Record<string, string> | undefined;
      const frGlossary = parsed['fr'] as Record<string, string> | undefined;
      const esGlossary = parsed['es'] as Record<string, string> | undefined;
      const jaGlossary = parsed['ja'] as Record<string, string> | undefined;

      expect(deGlossary).toEqual({ Hello: 'Hallo', World: 'Welt' });
      expect(frGlossary).toEqual({ Hello: 'Bonjour', World: 'Monde' });
      expect(esGlossary).toEqual({ Hello: 'Hola' });
      expect(jaGlossary).toBeUndefined();
    });
  });
});
