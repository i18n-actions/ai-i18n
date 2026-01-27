import { diffUnits, mergeDiffResults } from '../../../src/differ/differ';
import { hashContent } from '../../../src/differ/hasher';
import type { TranslationUnit } from '../../../src/types/translation';

describe('Differ', () => {
  const createUnit = (id: string, source: string, target?: string): TranslationUnit => ({
    id,
    source,
    target,
    hash: hashContent(source),
    metadata: { file: 'test.json' },
  });

  describe('diffUnits', () => {
    it('should identify new units', () => {
      const current = [
        createUnit('1', 'Hello'),
        createUnit('2', 'World'),
      ];
      const previousHashes = new Map<string, string>();

      const result = diffUnits(current, previousHashes);

      expect(result.summary.new).toBe(2);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.unchanged).toBe(0);
    });

    it('should identify unchanged units', () => {
      const current = [createUnit('1', 'Hello')];
      current[0]!.target = 'Hallo'; // Has translation
      const previousHashes = new Map([['1', hashContent('Hello')]]);

      const result = diffUnits(current, previousHashes);

      expect(result.summary.unchanged).toBe(1);
      expect(result.summary.new).toBe(0);
    });

    it('should identify modified units', () => {
      const current = [createUnit('1', 'Hello World')];
      const previousHashes = new Map([['1', hashContent('Hello')]]);

      const result = diffUnits(current, previousHashes);

      expect(result.summary.modified).toBe(1);
    });

    it('should identify deleted units', () => {
      const current: TranslationUnit[] = [];
      const previousHashes = new Map([['1', hashContent('Hello')]]);

      const result = diffUnits(current, previousHashes);

      expect(result.summary.deleted).toBe(1);
    });

    it('should treat missing target as new when translateMissingTargets is true', () => {
      const current = [createUnit('1', 'Hello')]; // No target
      const previousHashes = new Map([['1', hashContent('Hello')]]);

      const result = diffUnits(current, previousHashes, { translateMissingTargets: true });

      expect(result.summary.new).toBe(1);
    });

    it('should include unchanged units when requested', () => {
      const current = [createUnit('1', 'Hello')];
      current[0]!.target = 'Hallo';
      const previousHashes = new Map([['1', hashContent('Hello')]]);

      const result = diffUnits(current, previousHashes, { includeUnchanged: true });

      expect(result.entries.length).toBe(1);
      expect(result.entries[0]?.changeType).toBe('unchanged');
    });
  });

  describe('mergeDiffResults', () => {
    it('should merge multiple diff results', () => {
      const result1 = diffUnits([createUnit('1', 'Hello')], new Map());
      const result2 = diffUnits([createUnit('2', 'World')], new Map());

      const merged = mergeDiffResults([result1, result2]);

      expect(merged.summary.new).toBe(2);
      expect(merged.entries.length).toBe(2);
    });
  });
});
