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
  messages: {
    create: ReturnType<typeof vi.fn>;
    stream: ReturnType<typeof vi.fn>;
  };
};

const mockClient: MockClient = {
  messages: {
    create: vi.fn(),
    stream: vi.fn(),
  },
};

const MockAnthropic = vi.fn(() => mockClient);

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: MockAnthropic,
    APIError: MockAPIError,
  };
});

import { AnthropicProvider } from './AnthropicProvider';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.messages.create = vi.fn();
    mockClient.messages.stream = vi.fn();

    provider = new AnthropicProvider({
      apiKey: 'test-api-key',
      maxRetries: 2,
    });
  });

  describe('chat', () => {
    it('should successfully return a chat response', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Hi there!',
          },
        ],
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
        stop_reason: 'end_turn',
      });

      const response = await provider.chat(messages);

      expect(response).toEqual({
        content: 'Hi there!',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'end_turn',
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: undefined,
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: undefined,
        stop_sequences: undefined,
      });
    });

    it('should handle system messages correctly', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ];

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Hi there!',
          },
        ],
        usage: {
          input_tokens: 15,
          output_tokens: 5,
        },
        stop_reason: 'end_turn',
      });

      const response = await provider.chat(messages);

      expect(response.content).toBe('Hi there!');

      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: undefined,
        stop_sequences: undefined,
      });
    });

    it('should use custom model and options', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Response',
          },
        ],
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
      });

      await provider.chat(messages, {
        model: 'claude-3-opus-20240229',
        temperature: 0.7,
        maxTokens: 100,
        stopSequences: ['\n'],
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-opus-20240229',
        max_tokens: 100,
        system: undefined,
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.7,
        stop_sequences: ['\n'],
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

      mockClient.messages.create.mockRejectedValue(error);

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

      mockClient.messages.create.mockRejectedValue(error);

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
        { error: { message: 'Model not found: invalid-model' } },
        'Model not found: invalid-model',
        {}
      );

      mockClient.messages.create.mockRejectedValue(error);

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

      mockClient.messages.create.mockRejectedValue(error);

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

      mockClient.messages.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Success after retry',
            },
          ],
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
          stop_reason: 'end_turn',
        });

      const response = await provider.chat(messages);

      expect(response.content).toBe('Success after retry');
      expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
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

      mockClient.messages.create
        .mockRejectedValueOnce(serviceError)
        .mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Success after retry',
            },
          ],
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
          stop_reason: 'end_turn',
        });

      const response = await provider.chat(messages);

      expect(response.content).toBe('Success after retry');
      expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
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

      mockClient.messages.create.mockRejectedValue(authError);

      await expect(provider.chat(messages)).rejects.toThrow(
        AuthenticationError
      );

      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
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

      mockClient.messages.create.mockRejectedValue(serviceError);

      await expect(provider.chat(messages)).rejects.toThrow(
        ServiceUnavailableError
      );

      expect(mockClient.messages.create).toHaveBeenCalledTimes(3);
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

      mockClient.messages.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Success',
            },
          ],
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
          stop_reason: 'end_turn',
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
        yield {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Hello' },
        };
        yield {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: ' world' },
        };
        yield {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: '!' },
        };
      })();

      mockClient.messages.stream.mockResolvedValue(mockStream);

      const chunks: string[] = [];
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world', '!']);
    });

    it('should handle non-text deltas', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      const mockStream = (async function* () {
        yield { type: 'message_start' };
        yield {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Content' },
        };
        yield { type: 'message_stop' };
      })();

      mockClient.messages.stream.mockResolvedValue(mockStream);

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

      mockClient.messages.stream.mockRejectedValue(authError);

      const streamIterator = provider.stream(messages);

      await expect(streamIterator.next()).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should use custom model and options for streaming', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Test' },
      ];

      const mockStream = (async function* () {
        yield {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Response' },
        };
      })();

      mockClient.messages.stream.mockResolvedValue(mockStream);

      const chunks: string[] = [];
      for await (const chunk of provider.stream(messages, {
        model: 'claude-3-opus-20240229',
        temperature: 0.5,
        maxTokens: 200,
      })) {
        chunks.push(chunk);
      }

      expect(mockClient.messages.stream).toHaveBeenCalledWith({
        model: 'claude-3-opus-20240229',
        max_tokens: 200,
        system: 'You are helpful.',
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.5,
        stop_sequences: undefined,
      });
    });
  });

  describe('prepareMessages', () => {
    it('should separate system messages from conversation', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant response' },
        { role: 'user', content: 'Follow up' },
      ];

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      await provider.chat(messages);

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'System prompt',
          messages: [
            { role: 'user', content: 'User message' },
            { role: 'assistant', content: 'Assistant response' },
            { role: 'user', content: 'Follow up' },
          ],
        })
      );
    });

    it('should handle multiple system messages by using first one', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'First system' },
        { role: 'system', content: 'Second system' },
        { role: 'user', content: 'User message' },
      ];

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      await provider.chat(messages);

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'First system',
          messages: [{ role: 'user', content: 'User message' }],
        })
      );
    });
  });
});
