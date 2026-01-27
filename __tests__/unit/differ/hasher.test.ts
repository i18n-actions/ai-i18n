import {
  hashContent,
  normalizeContent,
  createHashMap,
  hashesMatch,
  createHashStore,
  addToHashStore,
  getUnitHash,
  serializeHashStore,
  parseHashStore,
} from '../../../src/differ/hasher';

describe('Hasher', () => {
  describe('normalizeContent', () => {
    it('should normalize whitespace', () => {
      const input = 'Hello   World';
      const normalized = normalizeContent(input);

      expect(normalized).toBe('Hello World');
    });

    it('should normalize line endings', () => {
      const input = 'Hello\r\nWorld';
      const normalized = normalizeContent(input);

      expect(normalized).toBe('Hello World');
    });

    it('should trim content', () => {
      const input = '  Hello  ';
      const normalized = normalizeContent(input);

      expect(normalized).toBe('Hello');
    });
  });

  describe('hashContent', () => {
    it('should produce consistent hashes', () => {
      const content = 'Hello, World!';
      const hash1 = hashContent(content);
      const hash2 = hashContent(content);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', () => {
      const hash1 = hashContent('Hello');
      const hash2 = hashContent('World');

      expect(hash1).not.toBe(hash2);
    });

    it('should truncate hash to specified length', () => {
      const hash = hashContent('Hello', { truncate: 8 });

      expect(hash.length).toBe(8);
    });

    it('should handle normalization option', () => {
      const hash1 = hashContent('Hello   World', { normalize: true });
      const hash2 = hashContent('Hello World', { normalize: true });

      expect(hash1).toBe(hash2);
    });

    it('should not normalize when option is false', () => {
      const hash1 = hashContent('Hello   World', { normalize: false });
      const hash2 = hashContent('Hello World', { normalize: false });

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createHashMap', () => {
    it('should create map from items', () => {
      const items = [
        { id: '1', source: 'Hello' },
        { id: '2', source: 'World' },
      ];

      const map = createHashMap(items);

      expect(map.size).toBe(2);
      expect(map.get('1')).toBe(hashContent('Hello'));
      expect(map.get('2')).toBe(hashContent('World'));
    });
  });

  describe('hashesMatch', () => {
    it('should return true for matching hashes', () => {
      const hash1 = hashContent('Hello');
      const hash2 = hashContent('Hello');

      expect(hashesMatch(hash1, hash2)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = hashContent('Hello');
      const hash2 = hashContent('World');

      expect(hashesMatch(hash1, hash2)).toBe(false);
    });

    it('should return false for different length hashes', () => {
      expect(hashesMatch('abc', 'abcd')).toBe(false);
    });
  });

  describe('HashStore', () => {
    it('should create empty store', () => {
      const store = createHashStore();

      expect(store.version).toBe(1);
      expect(Object.keys(store.files).length).toBe(0);
    });

    it('should add file hashes to store', () => {
      const store = createHashStore();
      const units = [
        { id: '1', source: 'Hello' },
        { id: '2', source: 'World' },
      ];

      addToHashStore(store, 'test.json', units);

      expect(store.files['test.json']).toBeDefined();
      expect(store.files['test.json']?.units['1']).toBeDefined();
      expect(store.files['test.json']?.units['2']).toBeDefined();
    });

    it('should get unit hash from store', () => {
      const store = createHashStore();
      addToHashStore(store, 'test.json', [{ id: '1', source: 'Hello' }]);

      const hash = getUnitHash(store, 'test.json', '1');

      expect(hash).toBe(hashContent('Hello'));
    });

    it('should return undefined for missing unit', () => {
      const store = createHashStore();

      const hash = getUnitHash(store, 'test.json', 'missing');

      expect(hash).toBeUndefined();
    });

    it('should serialize and parse store', () => {
      const store = createHashStore();
      addToHashStore(store, 'test.json', [{ id: '1', source: 'Hello' }]);

      const serialized = serializeHashStore(store);
      const parsed = parseHashStore(serialized);

      expect(parsed.version).toBe(store.version);
      expect(parsed.files['test.json']?.units['1']).toBe(store.files['test.json']?.units['1']);
    });
  });
});
