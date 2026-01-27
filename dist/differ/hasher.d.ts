/**
 * Options for content hashing
 */
export interface HashOptions {
    algorithm?: 'sha256' | 'md5' | 'sha1';
    truncate?: number;
    normalize?: boolean;
}
/**
 * Normalize string content for consistent hashing
 */
export declare function normalizeContent(content: string): string;
/**
 * Create a hash of content
 */
export declare function hashContent(content: string, options?: HashOptions): string;
/**
 * Create a hash map from an array of items with content
 */
export declare function createHashMap<T extends {
    id: string;
    source: string;
}>(items: T[], options?: HashOptions): Map<string, string>;
/**
 * Compare two hashes
 */
export declare function hashesMatch(hash1: string, hash2: string): boolean;
/**
 * Hash a file's content structure for detecting file-level changes
 */
export declare function hashFileContent(units: Array<{
    id: string;
    source: string;
}>): string;
/**
 * Storage format for persisted hashes
 */
export interface HashStore {
    version: number;
    generated: string;
    files: Record<string, {
        fileHash: string;
        units: Record<string, string>;
    }>;
}
/**
 * Create a new hash store
 */
export declare function createHashStore(): HashStore;
/**
 * Add file hashes to store
 */
export declare function addToHashStore(store: HashStore, filePath: string, units: Array<{
    id: string;
    source: string;
}>): void;
/**
 * Get unit hash from store
 */
export declare function getUnitHash(store: HashStore, filePath: string, unitId: string): string | undefined;
/**
 * Serialize hash store to JSON
 */
export declare function serializeHashStore(store: HashStore): string;
/**
 * Parse hash store from JSON
 */
export declare function parseHashStore(json: string): HashStore;
//# sourceMappingURL=hasher.d.ts.map