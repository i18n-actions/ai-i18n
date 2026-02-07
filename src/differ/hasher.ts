import * as crypto from 'crypto';

/**
 * Options for content hashing
 */
export interface HashOptions {
  algorithm?: 'sha256' | 'md5' | 'sha1';
  truncate?: number;
  normalize?: boolean;
}

const DEFAULT_HASH_OPTIONS: Required<HashOptions> = {
  algorithm: 'sha256',
  truncate: 16,
  normalize: true,
};

/**
 * Normalize string content for consistent hashing
 */
export function normalizeContent(content: string): string {
  return (
    content
      // Normalize Unicode to NFC form
      .normalize('NFC')
      // Normalize line endings to LF
      .replace(/\r\n/g, '\n')
      // Collapse multiple whitespace to single space
      .replace(/\s+/g, ' ')
      // Trim
      .trim()
  );
}

/**
 * Create a hash of content
 */
export function hashContent(content: string, options?: HashOptions): string {
  const opts = { ...DEFAULT_HASH_OPTIONS, ...options };

  const normalizedContent = opts.normalize ? normalizeContent(content) : content;

  const hash = crypto.createHash(opts.algorithm).update(normalizedContent).digest('hex');

  if (opts.truncate > 0 && opts.truncate < hash.length) {
    return hash.substring(0, opts.truncate);
  }

  return hash;
}

/**
 * Create a hash map from an array of items with content
 */
export function createHashMap<T extends { id: string; source: string }>(
  items: T[],
  options?: HashOptions
): Map<string, string> {
  const map = new Map<string, string>();

  for (const item of items) {
    map.set(item.id, hashContent(item.source, options));
  }

  return map;
}

/**
 * Compare two hashes
 */
export function hashesMatch(hash1: string, hash2: string): boolean {
  // Constant-time comparison to prevent timing attacks
  if (hash1.length !== hash2.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < hash1.length; i++) {
    result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Hash a file's content structure for detecting file-level changes
 */
export function hashFileContent(units: Array<{ id: string; source: string }>): string {
  // Create deterministic representation
  const sortedUnits = [...units].sort((a, b) => a.id.localeCompare(b.id));
  const content = sortedUnits.map(u => `${u.id}:${u.source}`).join('\n');

  return hashContent(content, { truncate: 32 });
}

/**
 * Storage format for persisted hashes
 */
export interface HashStore {
  version: number;
  generated: string;
  files: Record<
    string,
    {
      fileHash: string;
      units: Record<string, string>;
    }
  >;
}

/**
 * Create a new hash store
 */
export function createHashStore(): HashStore {
  return {
    version: 1,
    generated: new Date().toISOString(),
    files: {},
  };
}

/**
 * Add file hashes to store (merges with existing hashes)
 */
export function addToHashStore(
  store: HashStore,
  filePath: string,
  units: Array<{ id: string; source: string }>
): void {
  // Get existing hashes for this file (if any)
  const existingEntry = store.files[filePath];
  const existingHashes = existingEntry?.units ?? {};

  // Build new hashes from the provided units
  const newHashes: Record<string, string> = {};
  for (const unit of units) {
    newHashes[unit.id] = hashContent(unit.source);
  }

  // MERGE: existing hashes + new hashes (new hashes take precedence)
  const mergedHashes = { ...existingHashes, ...newHashes };

  store.files[filePath] = {
    fileHash: hashFileContent(units),
    units: mergedHashes,
  };
  store.generated = new Date().toISOString();
}

/**
 * Get unit hash from store
 */
export function getUnitHash(
  store: HashStore,
  filePath: string,
  unitId: string
): string | undefined {
  return store.files[filePath]?.units[unitId];
}

/**
 * Serialize hash store to JSON
 */
export function serializeHashStore(store: HashStore): string {
  return JSON.stringify(store, null, 2);
}

/**
 * Parse hash store from JSON
 */
export function parseHashStore(json: string): HashStore {
  const parsed = JSON.parse(json) as HashStore;

  if (parsed.version !== 1) {
    throw new Error(`Unsupported hash store version: ${parsed.version}`);
  }

  return parsed;
}
