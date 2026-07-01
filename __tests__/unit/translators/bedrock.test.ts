import type { TranslationRequest, TranslationUnit } from '../../../src/types/translation';
import { AuthenticationError, RateLimitError } from '../../../src/utils/errors';

// Mock the AWS SDK so no real network/credentials are needed
const sendMock = jest.fn();

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
  ConverseCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
}));

// Imported after the mock is registered
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockTranslator } from '../../../src/translators/providers/bedrock';

function makeUnit(id: string, source: string): TranslationUnit {
  return {
    id,
    source,
    metadata: { file: 'test.xliff' },
    hash: `hash-${id}`,
  };
}

function makeRequest(units: TranslationUnit[]): TranslationRequest {
  return {
    units,
    sourceLanguage: 'en',
    targetLanguage: 'de',
    preserveFormatting: true,
    preservePlaceholders: true,
  };
}

function converseResponse(translations: Array<{ id: string; translation: string }>) {
  return {
    output: {
      message: {
        role: 'assistant',
        content: [{ text: JSON.stringify({ translations }) }],
      },
    },
    usage: { inputTokens: 42, outputTokens: 17, totalTokens: 59 },
    stopReason: 'end_turn',
  };
}

describe('BedrockTranslator', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('uses a Claude-on-Bedrock model as the default', () => {
    const translator = new BedrockTranslator({ provider: 'bedrock', region: 'us-east-1' });
    expect(translator.providerName).toBe('bedrock');
    expect(translator.getModel()).toBe('anthropic.claude-3-haiku-20240307-v1:0');
  });

  it('honors an explicit model id', () => {
    const translator = new BedrockTranslator({
      provider: 'bedrock',
      region: 'us-east-1',
      model: 'meta.llama3-70b-instruct-v1:0',
    });
    expect(translator.getModel()).toBe('meta.llama3-70b-instruct-v1:0');
  });

  it('throws when region is missing', () => {
    const translator = new BedrockTranslator({ provider: 'bedrock' });
    expect(() => translator.validateConfig()).toThrow(/region is required/i);
  });

  it('passes explicit credentials to the client when provided', async () => {
    sendMock.mockResolvedValue(converseResponse([{ id: 'greeting', translation: 'Hallo' }]));

    const translator = new BedrockTranslator({
      provider: 'bedrock',
      region: 'eu-west-1',
      accessKeyId: 'AKIAEXAMPLE',
      secretAccessKey: 'secret',
      sessionToken: 'token',
    });

    await translator.translate(makeRequest([makeUnit('greeting', 'Hello')]));

    expect(BedrockRuntimeClient).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'eu-west-1',
        credentials: {
          accessKeyId: 'AKIAEXAMPLE',
          secretAccessKey: 'secret',
          sessionToken: 'token',
        },
      })
    );
  });

  it('omits credentials so the default AWS credential chain is used', async () => {
    sendMock.mockResolvedValue(converseResponse([{ id: 'greeting', translation: 'Hallo' }]));

    const translator = new BedrockTranslator({ provider: 'bedrock', region: 'us-east-1' });
    await translator.translate(makeRequest([makeUnit('greeting', 'Hello')]));

    expect(BedrockRuntimeClient).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'us-east-1', credentials: undefined })
    );
  });

  it('parses the Converse response and maps translations back to units', async () => {
    sendMock.mockResolvedValue(
      converseResponse([
        { id: 'greeting', translation: 'Hallo' },
        { id: 'farewell', translation: 'Auf Wiedersehen' },
      ])
    );

    const translator = new BedrockTranslator({ provider: 'bedrock', region: 'us-east-1' });
    const response = await translator.translate(
      makeRequest([makeUnit('greeting', 'Hello'), makeUnit('farewell', 'Goodbye')])
    );

    expect(response.provider).toBe('bedrock');
    expect(response.model).toBe('anthropic.claude-3-haiku-20240307-v1:0');
    expect(response.translations).toEqual([
      { id: 'greeting', source: 'Hello', target: 'Hallo' },
      { id: 'farewell', source: 'Goodbye', target: 'Auf Wiedersehen' },
    ]);
    expect(response.usage).toEqual({ inputTokens: 42, outputTokens: 17 });

    // System prompt + inference config forwarded to the Converse command
    expect(ConverseCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        system: expect.any(Array),
        inferenceConfig: expect.objectContaining({ temperature: expect.any(Number) }),
      })
    );
  });

  it('maps AccessDeniedException to a (non-retryable) AuthenticationError', async () => {
    sendMock.mockRejectedValue({
      name: 'AccessDeniedException',
      message: 'not authorized',
      $metadata: { httpStatusCode: 403 },
    });

    const translator = new BedrockTranslator({ provider: 'bedrock', region: 'us-east-1' });

    await expect(
      translator.translate(makeRequest([makeUnit('greeting', 'Hello')]))
    ).rejects.toThrow(AuthenticationError);
    // Non-retryable: only called once
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('maps ThrottlingException to a (retryable) RateLimitError', async () => {
    sendMock.mockRejectedValue({
      name: 'ThrottlingException',
      message: 'slow down',
      $metadata: { httpStatusCode: 429 },
    });

    const translator = new BedrockTranslator({ provider: 'bedrock', region: 'us-east-1' });

    // Fake timers so the retry backoff sleeps resolve instantly
    jest.useFakeTimers();
    try {
      const promise = translator.translate(makeRequest([makeUnit('greeting', 'Hello')]));
      const assertion = expect(promise).rejects.toThrow(RateLimitError);
      await jest.runAllTimersAsync();
      await assertion;
      // Retryable: exhausts the retry budget (initial attempt + 3 retries)
      expect(sendMock).toHaveBeenCalledTimes(4);
    } finally {
      jest.useRealTimers();
    }
  });
});
