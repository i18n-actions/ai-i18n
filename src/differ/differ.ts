import { logger } from '../utils/logger';
import type { ChangeType, DiffEntry, DiffResult, TranslationUnit } from '../types/translation';
import { hashContent, hashesMatch, HashStore } from './hasher';

/**
 * Options for diffing
 */
export interface DiffOptions {
  /**
   * Include units that haven't changed
   */
  includeUnchanged?: boolean;

  /**
   * Treat missing target as needing translation
   */
  translateMissingTargets?: boolean;
}

const DEFAULT_DIFF_OPTIONS: Required<DiffOptions> = {
  includeUnchanged: false,
  translateMissingTargets: true,
};

/**
 * Compare current translation units against previous hashes
 */
export function diffUnits(
  currentUnits: TranslationUnit[],
  previousHashes: Map<string, string>,
  options?: DiffOptions
): DiffResult {
  const opts = { ...DEFAULT_DIFF_OPTIONS, ...options };
  const entries: DiffEntry[] = [];

  const summary = {
    new: 0,
    modified: 0,
    deleted: 0,
    unchanged: 0,
    total: currentUnits.length,
  };

  const currentIds = new Set<string>();

  for (const unit of currentUnits) {
    currentIds.add(unit.id);

    const previousHash = previousHashes.get(unit.id);
    const currentHash = unit.hash || hashContent(unit.source);

    let changeType: ChangeType;

    if (!previousHash) {
      // New unit
      changeType = 'new';
      summary.new++;
    } else if (!hashesMatch(currentHash, previousHash)) {
      // Source changed
      changeType = 'modified';
      summary.modified++;
    } else if (opts.translateMissingTargets && !unit.target) {
      // Source unchanged but no target translation
      changeType = 'new';
      summary.new++;
    } else {
      // No changes
      changeType = 'unchanged';
      summary.unchanged++;

      if (!opts.includeUnchanged) {
        continue;
      }
    }

    entries.push({
      unit,
      changeType,
      previousHash,
    });
  }

  // Find deleted units
  for (const [id, hash] of previousHashes) {
    if (!currentIds.has(id)) {
      summary.deleted++;
      // We don't have the full unit for deleted items, create minimal entry
      entries.push({
        unit: {
          id,
          source: '',
          hash,
          metadata: { file: '' },
        },
        changeType: 'deleted',
        previousHash: hash,
      });
    }
  }

  return { entries, summary };
}

/**
 * Compare against a hash store
 */
export function diffAgainstStore(
  filePath: string,
  currentUnits: TranslationUnit[],
  store: HashStore,
  options?: DiffOptions
): DiffResult {
  const fileEntry = store.files[filePath];
  const previousHashes = new Map<string, string>();

  if (fileEntry) {
    for (const [id, hash] of Object.entries(fileEntry.units)) {
      previousHashes.set(id, hash);
    }
  }

  return diffUnits(currentUnits, previousHashes, options);
}

/**
 * Filter units that need translation (new or modified)
 */
export function getUnitsNeedingTranslation(diffResult: DiffResult): TranslationUnit[] {
  return diffResult.entries
    .filter(entry => entry.changeType === 'new' || entry.changeType === 'modified')
    .map(entry => entry.unit);
}

/**
 * Create a diff result comparing two sets of units directly
 */
export function diffUnitSets(
  currentUnits: TranslationUnit[],
  previousUnits: TranslationUnit[],
  options?: DiffOptions
): DiffResult {
  const previousHashes = new Map<string, string>();

  for (const unit of previousUnits) {
    previousHashes.set(unit.id, unit.hash || hashContent(unit.source));
  }

  return diffUnits(currentUnits, previousHashes, options);
}

/**
 * Log diff summary
 */
export function logDiffSummary(diffResult: DiffResult, filePath?: string): void {
  const { summary } = diffResult;
  const prefix = filePath ? `[${filePath}] ` : '';

  logger.info(`${prefix}Diff summary:`, {
    new: summary.new,
    modified: summary.modified,
    deleted: summary.deleted,
    unchanged: summary.unchanged,
    total: summary.total,
  });

  if (summary.new > 0) {
    logger.info(`${prefix}  → ${summary.new} new strings to translate`);
  }
  if (summary.modified > 0) {
    logger.info(`${prefix}  → ${summary.modified} modified strings to re-translate`);
  }
  if (summary.deleted > 0) {
    logger.info(`${prefix}  → ${summary.deleted} strings removed`);
  }
}

/**
 * Merge multiple diff results
 */
export function mergeDiffResults(results: DiffResult[]): DiffResult {
  const entries: DiffEntry[] = [];
  const summary = {
    new: 0,
    modified: 0,
    deleted: 0,
    unchanged: 0,
    total: 0,
  };

  for (const result of results) {
    entries.push(...result.entries);
    summary.new += result.summary.new;
    summary.modified += result.summary.modified;
    summary.deleted += result.summary.deleted;
    summary.unchanged += result.summary.unchanged;
    summary.total += result.summary.total;
  }

  return { entries, summary };
}
