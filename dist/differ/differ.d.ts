import type { DiffResult, TranslationUnit } from '../types/translation';
import { HashStore } from './hasher';
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
/**
 * Compare current translation units against previous hashes
 */
export declare function diffUnits(currentUnits: TranslationUnit[], previousHashes: Map<string, string>, options?: DiffOptions): DiffResult;
/**
 * Compare against a hash store
 */
export declare function diffAgainstStore(filePath: string, currentUnits: TranslationUnit[], store: HashStore, options?: DiffOptions): DiffResult;
/**
 * Filter units that need translation (new or modified)
 */
export declare function getUnitsNeedingTranslation(diffResult: DiffResult): TranslationUnit[];
/**
 * Create a diff result comparing two sets of units directly
 */
export declare function diffUnitSets(currentUnits: TranslationUnit[], previousUnits: TranslationUnit[], options?: DiffOptions): DiffResult;
/**
 * Log diff summary
 */
export declare function logDiffSummary(diffResult: DiffResult, filePath?: string): void;
/**
 * Merge multiple diff results
 */
export declare function mergeDiffResults(results: DiffResult[]): DiffResult;
//# sourceMappingURL=differ.d.ts.map