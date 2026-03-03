import type { TranslationUnit, DiffEntry, DiffResult } from '../../../src/types/translation';
import { getUnitsNeedingTranslation } from '../../../src/differ/differ';

/**
 * Mirrors the isReviewedUnit logic from main.ts for testing
 */
function isReviewedUnit(unit: TranslationUnit): boolean {
  const state = unit.metadata.state?.toLowerCase();
  if (state === 'reviewed' || state === 'final') {
    return true;
  }
  if (unit.metadata.approved === true) {
    return true;
  }
  return false;
}

/**
 * Mirrors the reviewed-unit filtering logic from processFile in main.ts
 */
function filterReviewedUnits(
  unitsToTranslate: TranslationUnit[],
  diffResult: DiffResult,
  existingUnits: TranslationUnit[]
): TranslationUnit[] {
  const reviewedIds = new Set(existingUnits.filter(isReviewedUnit).map(u => u.id));

  if (reviewedIds.size === 0) {
    return unitsToTranslate;
  }

  const changeTypeMap = new Map(diffResult.entries.map(e => [e.unit.id, e.changeType]));

  return unitsToTranslate.filter(unit => {
    const changeType = changeTypeMap.get(unit.id);
    if (changeType === 'modified') {
      return true;
    }
    if (changeType === 'new' && reviewedIds.has(unit.id)) {
      return false;
    }
    return true;
  });
}

function makeUnit(
  id: string,
  source: string,
  opts?: { state?: string; approved?: boolean; target?: string }
): TranslationUnit {
  return {
    id,
    source,
    target: opts?.target,
    hash: `hash-${id}`,
    metadata: {
      file: 'test.xliff',
      state: opts?.state,
      approved: opts?.approved,
    },
  };
}

describe('Reviewed Unit Filtering', () => {
  describe('isReviewedUnit', () => {
    it('should detect state="reviewed"', () => {
      const unit = makeUnit('1', 'Hello', { state: 'reviewed', target: 'Hallo' });
      expect(isReviewedUnit(unit)).toBe(true);
    });

    it('should detect state="final"', () => {
      const unit = makeUnit('1', 'Hello', { state: 'final', target: 'Hallo' });
      expect(isReviewedUnit(unit)).toBe(true);
    });

    it('should detect approved=true', () => {
      const unit = makeUnit('1', 'Hello', { approved: true, target: 'Hallo' });
      expect(isReviewedUnit(unit)).toBe(true);
    });

    it('should be case insensitive for state', () => {
      const unit = makeUnit('1', 'Hello', { state: 'Reviewed', target: 'Hallo' });
      expect(isReviewedUnit(unit)).toBe(true);
    });

    it('should not detect state="translated"', () => {
      const unit = makeUnit('1', 'Hello', { state: 'translated', target: 'Hallo' });
      expect(isReviewedUnit(unit)).toBe(false);
    });

    it('should not detect state="new"', () => {
      const unit = makeUnit('1', 'Hello', { state: 'new' });
      expect(isReviewedUnit(unit)).toBe(false);
    });

    it('should not detect unit with no state or approved', () => {
      const unit = makeUnit('1', 'Hello');
      expect(isReviewedUnit(unit)).toBe(false);
    });

    it('should not detect approved=false', () => {
      const unit = makeUnit('1', 'Hello', { approved: false });
      expect(isReviewedUnit(unit)).toBe(false);
    });
  });

  describe('filterReviewedUnits', () => {
    it('should skip reviewed "new" units', () => {
      // Source units that diff says are "new" (not in hash store)
      const sourceUnits = [
        makeUnit('1', 'Hello'),
        makeUnit('2', 'World'),
        makeUnit('3', 'Goodbye'),
      ];

      // Existing target units — unit 1 is reviewed, others are not
      const existingTargetUnits = [
        makeUnit('1', 'Hello', { state: 'reviewed', target: 'Hallo' }),
        makeUnit('2', 'World', { state: 'translated', target: 'Welt' }),
      ];

      const diffResult: DiffResult = {
        entries: [
          { unit: sourceUnits[0], changeType: 'new' },
          { unit: sourceUnits[1], changeType: 'new' },
          { unit: sourceUnits[2], changeType: 'new' },
        ],
        summary: { new: 3, modified: 0, deleted: 0, unchanged: 0, total: 3 },
      };

      const unitsToTranslate = getUnitsNeedingTranslation(diffResult);
      const filtered = filterReviewedUnits(unitsToTranslate, diffResult, existingTargetUnits);

      // Unit 1 should be skipped (reviewed + new), units 2 and 3 should remain
      expect(filtered.map(u => u.id)).toEqual(['2', '3']);
    });

    it('should always retranslate modified units even if reviewed', () => {
      const sourceUnits = [
        makeUnit('1', 'Hello updated'), // source text changed
        makeUnit('2', 'World'),
      ];

      const existingTargetUnits = [
        makeUnit('1', 'Hello', { state: 'reviewed', target: 'Hallo' }),
        makeUnit('2', 'World', { state: 'reviewed', target: 'Welt' }),
      ];

      const diffResult: DiffResult = {
        entries: [
          { unit: sourceUnits[0], changeType: 'modified', previousHash: 'old-hash-1' },
          { unit: sourceUnits[1], changeType: 'new' },
        ],
        summary: { new: 1, modified: 1, deleted: 0, unchanged: 0, total: 2 },
      };

      const unitsToTranslate = getUnitsNeedingTranslation(diffResult);
      const filtered = filterReviewedUnits(unitsToTranslate, diffResult, existingTargetUnits);

      // Unit 1 should remain (modified overrides reviewed state)
      // Unit 2 should be skipped (new + reviewed)
      expect(filtered.map(u => u.id)).toEqual(['1']);
    });

    it('should not filter when no reviewed units exist', () => {
      const sourceUnits = [makeUnit('1', 'Hello'), makeUnit('2', 'World')];

      const existingTargetUnits = [
        makeUnit('1', 'Hello', { state: 'translated', target: 'Hallo' }),
        makeUnit('2', 'World', { state: 'translated', target: 'Welt' }),
      ];

      const diffResult: DiffResult = {
        entries: [
          { unit: sourceUnits[0], changeType: 'new' },
          { unit: sourceUnits[1], changeType: 'new' },
        ],
        summary: { new: 2, modified: 0, deleted: 0, unchanged: 0, total: 2 },
      };

      const unitsToTranslate = getUnitsNeedingTranslation(diffResult);
      const filtered = filterReviewedUnits(unitsToTranslate, diffResult, existingTargetUnits);

      expect(filtered.map(u => u.id)).toEqual(['1', '2']);
    });

    it('should handle approved=yes units', () => {
      const sourceUnits = [makeUnit('1', 'Hello')];

      const existingTargetUnits = [makeUnit('1', 'Hello', { approved: true, target: 'Hallo' })];

      const diffResult: DiffResult = {
        entries: [{ unit: sourceUnits[0], changeType: 'new' }],
        summary: { new: 1, modified: 0, deleted: 0, unchanged: 0, total: 1 },
      };

      const unitsToTranslate = getUnitsNeedingTranslation(diffResult);
      const filtered = filterReviewedUnits(unitsToTranslate, diffResult, existingTargetUnits);

      expect(filtered).toEqual([]);
    });

    it('should handle state="final" units', () => {
      const sourceUnits = [makeUnit('1', 'Hello')];

      const existingTargetUnits = [makeUnit('1', 'Hello', { state: 'final', target: 'Hallo' })];

      const diffResult: DiffResult = {
        entries: [{ unit: sourceUnits[0], changeType: 'new' }],
        summary: { new: 1, modified: 0, deleted: 0, unchanged: 0, total: 1 },
      };

      const unitsToTranslate = getUnitsNeedingTranslation(diffResult);
      const filtered = filterReviewedUnits(unitsToTranslate, diffResult, existingTargetUnits);

      expect(filtered).toEqual([]);
    });

    it('should handle empty existing units', () => {
      const sourceUnits = [makeUnit('1', 'Hello')];

      const diffResult: DiffResult = {
        entries: [{ unit: sourceUnits[0], changeType: 'new' }],
        summary: { new: 1, modified: 0, deleted: 0, unchanged: 0, total: 1 },
      };

      const unitsToTranslate = getUnitsNeedingTranslation(diffResult);
      const filtered = filterReviewedUnits(unitsToTranslate, diffResult, []);

      expect(filtered.map(u => u.id)).toEqual(['1']);
    });
  });
});
