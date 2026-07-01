import { createTranslator, getDefaultModel } from '../../../src/translators/factory';
import { AnthropicTranslator } from '../../../src/translators/providers/anthropic';
import { OpenAITranslator } from '../../../src/translators/providers/openai';
import { OllamaTranslator } from '../../../src/translators/providers/ollama';
import { BedrockTranslator } from '../../../src/translators/providers/bedrock';

describe('createTranslator', () => {
  it('creates an AnthropicTranslator', () => {
    const t = createTranslator({ provider: 'anthropic', apiKey: 'sk-test' });
    expect(t).toBeInstanceOf(AnthropicTranslator);
  });

  it('creates an OpenAITranslator', () => {
    const t = createTranslator({ provider: 'openai', apiKey: 'sk-test' });
    expect(t).toBeInstanceOf(OpenAITranslator);
  });

  it('creates an OllamaTranslator', () => {
    const t = createTranslator({ provider: 'ollama', baseUrl: 'http://localhost:11434' });
    expect(t).toBeInstanceOf(OllamaTranslator);
  });

  it('creates a BedrockTranslator', () => {
    const t = createTranslator({ provider: 'bedrock', region: 'us-east-1' });
    expect(t).toBeInstanceOf(BedrockTranslator);
    expect(t.providerName).toBe('bedrock');
  });

  it('throws for an unknown provider', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createTranslator({ provider: 'nope' as any })
    ).toThrow(/Unknown provider/);
  });
});

describe('getDefaultModel', () => {
  it('returns provider defaults', () => {
    expect(getDefaultModel('anthropic')).toBe('claude-3-haiku-20240307');
    expect(getDefaultModel('openai')).toBe('gpt-4o-mini');
    expect(getDefaultModel('ollama')).toBe('llama3.2');
    expect(getDefaultModel('bedrock')).toBe('anthropic.claude-3-haiku-20240307-v1:0');
  });
});
