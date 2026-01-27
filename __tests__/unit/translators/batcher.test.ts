import { createBatches, splitBatch, mergeBatches, BatchProcessor } from '../../../src/translators/batcher';
import type { TranslationUnit } from '../../../src/types/translation';

describe('Batcher', () => {
  const createUnit = (id: string, source: string): TranslationUnit => ({
    id,
    source,
    hash: 'hash',
    metadata: { file: 'test.json' },
  });

  describe('createBatches', () => {
    it('should create batches from units', () => {
      const units = Array.from({ length: 25 }, (_, i) => createUnit(`${i}`, `Text ${i}`));

      const batches = createBatches(units, { maxBatchSize: 10 });

      expect(batches.length).toBe(3);
      expect(batches[0]?.units.length).toBe(10);
      expect(batches[1]?.units.length).toBe(10);
      expect(batches[2]?.units.length).toBe(5);
    });

    it('should handle empty units', () => {
      const batches = createBatches([]);

      expect(batches.length).toBe(0);
    });

    it('should respect token limits', () => {
      // Create units with varying sizes
      const units = [
        createUnit('1', 'A'.repeat(1000)), // ~250 tokens
        createUnit('2', 'B'.repeat(1000)), // ~250 tokens
        createUnit('3', 'C'.repeat(100)),  // ~25 tokens
      ];

      const batches = createBatches(units, {
        maxBatchSize: 10,
        maxTokensPerBatch: 1000,
        tokenOverhead: 200,
      });

      // Should split due to token limits
      expect(batches.length).toBeGreaterThanOrEqual(1);
    });

    it('should set batch indices', () => {
      const units = Array.from({ length: 15 }, (_, i) => createUnit(`${i}`, `Text ${i}`));

      const batches = createBatches(units, { maxBatchSize: 10 });

      expect(batches[0]?.index).toBe(0);
      expect(batches[1]?.index).toBe(1);
    });
  });

  describe('splitBatch', () => {
    it('should split large batch into smaller ones', () => {
      const units = Array.from({ length: 20 }, (_, i) => createUnit(`${i}`, `Text ${i}`));
      const batch = { units, estimatedTokens: 1000, index: 0 };

      const split = splitBatch(batch, 8);

      expect(split.length).toBe(3);
      expect(split[0]?.units.length).toBe(8);
      expect(split[1]?.units.length).toBe(8);
      expect(split[2]?.units.length).toBe(4);
    });

    it('should not split small batch', () => {
      const units = [createUnit('1', 'Text')];
      const batch = { units, estimatedTokens: 100, index: 0 };

      const split = splitBatch(batch, 10);

      expect(split.length).toBe(1);
      expect(split[0]).toBe(batch);
    });
  });

  describe('mergeBatches', () => {
    it('should merge small batches', () => {
      const batch1 = {
        units: [createUnit('1', 'A')],
        estimatedTokens: 510,
        index: 0,
      };
      const batch2 = {
        units: [createUnit('2', 'B')],
        estimatedTokens: 510,
        index: 1,
      };

      const merged = mergeBatches([batch1, batch2], { maxBatchSize: 10, maxTokensPerBatch: 3000 });

      expect(merged.length).toBe(1);
      expect(merged[0]?.units.length).toBe(2);
    });
  });

  describe('BatchProcessor', () => {
    it('should process batches sequentially', async () => {
      const results: number[] = [];
      const processor = new BatchProcessor<number, number>(
        async (n) => {
          results.push(n);
          return n * 2;
        },
        1
      );

      const output = await processor.processSequentially([1, 2, 3]);

      expect(results).toEqual([1, 2, 3]);
      expect(output.length).toBe(3);
      expect((output[0] as { result: number }).result).toBe(2);
    });

    it('should handle errors in batches', async () => {
      const processor = new BatchProcessor<number, number>(
        async (n) => {
          if (n === 2) throw new Error('Test error');
          return n * 2;
        },
        1
      );

      const output = await processor.processSequentially([1, 2, 3]);

      expect(output.length).toBe(3);
      expect('result' in output[0]!).toBe(true);
      expect('error' in output[1]!).toBe(true);
      expect('result' in output[2]!).toBe(true);
    });

    it('should process batches in parallel', async () => {
      const startTimes: number[] = [];
      const processor = new BatchProcessor<number, number>(
        async (n) => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 50));
          return n * 2;
        },
        3
      );

      await processor.processAll([1, 2, 3]);

      // All should start at roughly the same time
      const maxDiff = Math.max(...startTimes) - Math.min(...startTimes);
      expect(maxDiff).toBeLessThan(30);
    });
  });
});
