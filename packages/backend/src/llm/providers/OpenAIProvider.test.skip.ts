import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatMessage } from '@obsidian/core';
import {
  AuthenticationError,
  InvalidRequestError,
  ModelNotFoundError,
  ServiceUnavailableError,
} from '@obsidian/core';

class MockAPIError extends Error {
  constructor(
    public status: number | undefined,
    public error: unknown,
    message: string,
    public headers: Record<string, string | undefined>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

type MockClient = {
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
};

const mockClient: MockClient = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

const MockOpenAI = vi.fn(() => mockClient);

vi.mock('openai', () => {
  return {
    default: MockOpenAI,
    APIError: MockAPIError,
  };
});

import { OpenAIProvider } from './OpenAIProvider';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.chat.completions.create = vi.fn();

    provider = new OpenAIProvider({
      apiKey: 'test-api-key',
      maxRetries: 2,
    });
  });

  describe('chat', () => {
    it('should successfully return a chat response', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: { content: 'Hi there!' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      });

      const response = await provider.chat(messages);

      expect(response).toEqual({
        content: 'Hi there!',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
      });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: undefined,
        max_tokens: undefined,
        stop: undefined,
      });
    });

    it('should use custom model and options', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
      });

      await provider.chat(messages, {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 100,
        stopSequences: ['\n'],
      });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.7,
        max_tokens: 100,
        stop: ['\n'],
      });
    });

    it('should throw AuthenticationError on 401', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const error = new MockAPIError(
        401,
        { error: { message: 'Invalid API key' } },
        'Invalid API key',
        {}
      );

      mockClient.chat.completions.create.mockRejectedValue(error);

      await expect(provider.chat(messages)).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should throw InvalidRequestError on 400', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const error = new MockAPIError(
        400,
        { error: { message: 'Invalid request' } },
        'Invalid request',
        {}
      );

      mockClient.chat.completions.create.mockRejectedValue(error);

      await expect(provider.chat(messages)).rejects.toThrow(
        InvalidRequestError
      );
    });

    it('should throw ModelNotFoundError on 404', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const error = new MockAPIError(
        404,
        { error: { message: 'Model not found: gpt-5' } },
        'Model not found: gpt-5',
        {}
      );

      mockClient.chat.completions.create.mockRejectedValue(error);

      await expect(provider.chat(messages)).rejects.toThrow(
        ModelNotFoundError
      );
    });

    it('should throw ServiceUnavailableError on 503', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const error = new MockAPIError(
        503,
        { error: { message: 'Service unavailable' } },
        'Service unavailable',
        {}
      );

      mockClient.chat.completions.create.mockRejectedValue(error);

      await expect(provider.chat(messages)).rejects.toThrow(
        ServiceUnavailableError
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on rate limit error', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const rateLimitError = new MockAPIError(
        429,
        { error: { message: 'Rate limit exceeded' } },
        'Rate limit exceeded',
        { 'retry-after': '1' }
      );

      mockClient.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({
          choices: [
            {
              message: { content: 'Success after retry' },
              finish_reason: 'stop',
            },
          ],
        });

      const response = await provider.chat(messages);

      expect(response.content).toBe('Success after retry');
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 error', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const serviceError = new MockAPIError(
        503,
        { error: { message: 'Service unavailable' } },
        'Service unavailable',
        {}
      );

      mockClient.chat.completions.create
        .mockRejectedValueOnce(serviceError)
        .mockResolvedValue({
          choices: [
            {
              message: { content: 'Success after retry' },
              finish_reason: 'stop',
            },
          ],
        });

      const response = await provider.chat(messages);

      expect(response.content).toBe('Success after retry');
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should not retry on authentication error', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const authError = new MockAPIError(
        401,
        { error: { message: 'Invalid API key' } },
        'Invalid API key',
        {}
      );

      mockClient.chat.completions.create.mockRejectedValue(authError);

      await expect(provider.chat(messages)).rejects.toThrow(
        AuthenticationError
      );

      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const serviceError = new MockAPIError(
        503,
        { error: { message: 'Service unavailable' } },
        'Service unavailable',
        {}
      );

      mockClient.chat.completions.create.mockRejectedValue(serviceError);

      await expect(provider.chat(messages)).rejects.toThrow(
        ServiceUnavailableError
      );

      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should use retry-after header for rate limit delay', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const rateLimitError = new MockAPIError(
        429,
        { error: { message: 'Rate limit exceeded' } },
        'Rate limit exceeded',
        { 'retry-after': '2' }
      );

      mockClient.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({
          choices: [
            {
              message: { content: 'Success' },
              finish_reason: 'stop',
            },
          ],
        });

      const startTime = Date.now();
      await provider.chat(messages);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(1900);
    });
  });

  describe('stream', () => {
    it('should stream response chunks', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Stream test' },
      ];

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'Hello' } }] };
        yield { choices: [{ delta: { content: ' world' } }] };
        yield { choices: [{ delta: { content: '!' } }] };
      })();

      mockClient.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: string[] = [];
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world', '!']);
    });

    it('should handle empty deltas', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const mockStream = (async function* () {
        yield { choices: [{ delta: {} }] };
        yield { choices: [{ delta: { content: 'Content' } }] };
        yield { choices: [{ delta: {} }] };
      })();

      mockClient.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: string[] = [];
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Content']);
    });

    it('should throw error during streaming', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const authError = new MockAPIError(
        401,
        { error: { message: 'Invalid API key' } },
        'Invalid API key',
        {}
      );

      mockClient.chat.completions.create.mockRejectedValue(authError);

      const streamIterator = provider.stream(messages);

      await expect(streamIterator.next()).rejects.toThrow(
        AuthenticationError
      );
    });
  });
});
