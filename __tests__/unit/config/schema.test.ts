import {
  providerSchema,
  fileFormatSchema,
  languageCodeSchema,
  providerConfigSchema,
  translationConfigSchema,
  isValidProvider,
  isValidFileFormat,
} from '../../../src/config/schema';

describe('Config Schema', () => {
  describe('providerSchema', () => {
    it('should accept valid providers', () => {
      expect(providerSchema.parse('anthropic')).toBe('anthropic');
      expect(providerSchema.parse('openai')).toBe('openai');
      expect(providerSchema.parse('ollama')).toBe('ollama');
    });

    it('should reject invalid providers', () => {
      expect(() => providerSchema.parse('invalid')).toThrow();
    });
  });

  describe('fileFormatSchema', () => {
    it('should accept valid formats', () => {
      expect(fileFormatSchema.parse('xliff-1.2')).toBe('xliff-1.2');
      expect(fileFormatSchema.parse('xliff-2.0')).toBe('xliff-2.0');
      expect(fileFormatSchema.parse('json-flat')).toBe('json-flat');
      expect(fileFormatSchema.parse('json-nested')).toBe('json-nested');
      expect(fileFormatSchema.parse('auto')).toBe('auto');
    });

    it('should reject invalid formats', () => {
      expect(() => fileFormatSchema.parse('yaml')).toThrow();
    });
  });

  describe('languageCodeSchema', () => {
    it('should accept valid language codes', () => {
      expect(languageCodeSchema.parse('en')).toBe('en');
      expect(languageCodeSchema.parse('en-US')).toBe('en-US');
      expect(languageCodeSchema.parse('zh-Hans')).toBe('zh-Hans');
    });

    it('should reject invalid language codes', () => {
      expect(() => languageCodeSchema.parse('e')).toThrow();
      expect(() => languageCodeSchema.parse('english')).toThrow();
    });
  });

  describe('providerConfigSchema', () => {
    it('should accept valid anthropic config', () => {
      const config = {
        provider: 'anthropic',
        apiKey: 'sk-test-key',
      };

      const result = providerConfigSchema.parse(config);

      expect(result.provider).toBe('anthropic');
      expect(result.apiKey).toBe('sk-test-key');
    });

    it('should accept valid openai config', () => {
      const config = {
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
      };

      const result = providerConfigSchema.parse(config);

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
    });

    it('should accept valid ollama config', () => {
      const config = {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
      };

      const result = providerConfigSchema.parse(config);

      expect(result.provider).toBe('ollama');
      expect(result.baseUrl).toBe('http://localhost:11434');
    });

    it('should reject anthropic without apiKey', () => {
      const config = {
        provider: 'anthropic',
      };

      expect(() => providerConfigSchema.parse(config)).toThrow();
    });

    it('should reject ollama without baseUrl', () => {
      const config = {
        provider: 'ollama',
      };

      expect(() => providerConfigSchema.parse(config)).toThrow();
    });
  });

  describe('translationConfigSchema', () => {
    it('should accept valid config with defaults', () => {
      const config = {};

      const result = translationConfigSchema.parse(config);

      expect(result.batchSize).toBe(10);
      expect(result.maxRetries).toBe(3);
      expect(result.retryDelayMs).toBe(1000);
      expect(result.preserveFormatting).toBe(true);
      expect(result.preservePlaceholders).toBe(true);
    });

    it('should accept custom values', () => {
      const config = {
        batchSize: 20,
        maxRetries: 5,
        context: 'Mobile app translations',
      };

      const result = translationConfigSchema.parse(config);

      expect(result.batchSize).toBe(20);
      expect(result.maxRetries).toBe(5);
      expect(result.context).toBe('Mobile app translations');
    });

    it('should reject invalid batch size', () => {
      const config = { batchSize: 200 };

      expect(() => translationConfigSchema.parse(config)).toThrow();
    });
  });

  describe('isValidProvider', () => {
    it('should return true for valid providers', () => {
      expect(isValidProvider('anthropic')).toBe(true);
      expect(isValidProvider('openai')).toBe(true);
      expect(isValidProvider('ollama')).toBe(true);
    });

    it('should return false for invalid providers', () => {
      expect(isValidProvider('invalid')).toBe(false);
      expect(isValidProvider('')).toBe(false);
    });
  });

  describe('isValidFileFormat', () => {
    it('should return true for valid formats', () => {
      expect(isValidFileFormat('xliff-1.2')).toBe(true);
      expect(isValidFileFormat('json-flat')).toBe(true);
      expect(isValidFileFormat('auto')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(isValidFileFormat('yaml')).toBe(false);
      expect(isValidFileFormat('')).toBe(false);
    });
  });
});
