/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatMessage } from '@obsidian/core';
import {
  AuthenticationError,
  InvalidRequestError,
  ModelNotFoundError,
  ServiceUnavailableError,
  TimeoutError,
} from '@obsidian/core';

const mockPost = vi.fn();
const mockCreate = vi.fn(() => ({
  post: mockPost,
}));

vi.mock('axios', () => {
  return {
    default: {
      create: mockCreate,
    },
    isAxiosError: vi.fn(),
  };
});

import { OllamaProvider } from './OllamaProvider';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockReset();

    provider = new OllamaProvider({
      baseURL: 'http://localhost:11434',
      maxRetries: 2,
    });
  });

  describe('chat', () => {
    it('should successfully return a chat response', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      mockPost.mockResolvedValue({
        data: {
          model: 'llama3',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Hi there!',
          },
          done: true,
          prompt_eval_count: 10,
          eval_count: 5,
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

      expect(mockPost).toHaveBeenCalledWith('/api/chat', {
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
        options: {
          temperature: undefined,
          num_predict: undefined,
          stop: undefined,
        },
      });
    });

    it('should handle custom model and options', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      mockPost.mockResolvedValue({
        data: {
          model: 'codellama',
          message: {
            role: 'assistant',
            content: 'Response',
          },
          done: true,
        },
      });

      await provider.chat(messages, {
        model: 'codellama',
        temperature: 0.7,
        maxTokens: 100,
        stopSequences: ['###'],
      });

      expect(mockPost).toHaveBeenCalledWith('/api/chat', {
        model: 'codellama',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 100,
          stop: ['###'],
        },
      });
    });

    it('should handle response without usage data', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      mockPost.mockResolvedValue({
        data: {
          model: 'llama3',
          message: {
            role: 'assistant',
            content: 'Hi!',
          },
          done: true,
        },
      });

      const response = await provider.chat(messages);

      expect(response).toEqual({
        content: 'Hi!',
        usage: undefined,
        finishReason: 'stop',
      });
    });

    it('should throw ServiceUnavailableError on connection refused', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const error: any = new Error('connect ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      error.isAxiosError = true;
      mockPost.mockRejectedValue(error);

      const { isAxiosError } = await import('axios');
      (isAxiosError as any).mockReturnValue(true);

      await expect(provider.chat(messages)).rejects.toThrow(ServiceUnavailableError);
      await expect(provider.chat(messages)).rejects.toThrow(
        'Cannot connect to Ollama server. Please ensure Ollama is running.'
      );
    });

    it('should throw TimeoutError on timeout', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const error: any = new Error('timeout');
      error.code = 'ETIMEDOUT';
      error.isAxiosError = true;
      mockPost.mockRejectedValue(error);

      const { isAxiosError } = await import('axios');
      (isAxiosError as any).mockReturnValue(true);

      await expect(provider.chat(messages)).rejects.toThrow(TimeoutError);
    });

    it('should throw ModelNotFoundError on 404', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const error: any = new Error('Model not found');
      error.isAxiosError = true;
      error.response = {
        status: 404,
        data: { error: 'model "nonexistent" not found' },
      };
      mockPost.mockRejectedValue(error);

      const { isAxiosError } = await import('axios');
      (isAxiosError as any).mockReturnValue(true);

      await expect(provider.chat(messages)).rejects.toThrow(ModelNotFoundError);
    });

    it('should throw InvalidRequestError on 400', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const error: any = new Error('Bad request');
      error.isAxiosError = true;
      error.response = {
        status: 400,
        data: { error: 'invalid request' },
      };
      mockPost.mockRejectedValue(error);

      const { isAxiosError } = await import('axios');
      (isAxiosError as any).mockReturnValue(true);

      await expect(provider.chat(messages)).rejects.toThrow(InvalidRequestError);
    });

    it('should retry on ServiceUnavailableError', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const error: any = new Error('Service unavailable');
      error.isAxiosError = true;
      error.response = {
        status: 503,
      };

      mockPost.mockRejectedValueOnce(error).mockResolvedValueOnce({
        data: {
          model: 'llama3',
          message: {
            role: 'assistant',
            content: 'Success after retry',
          },
          done: true,
        },
      });

      const { isAxiosError } = await import('axios');
      (isAxiosError as any).mockReturnValue(true);

      const response = await provider.chat(messages);

      expect(response.content).toBe('Success after retry');
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('should not retry on AuthenticationError', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const error: any = new Error('Unauthorized');
      error.isAxiosError = true;
      error.response = {
        status: 401,
      };
      mockPost.mockRejectedValue(error);

      const { isAxiosError } = await import('axios');
      (isAxiosError as any).mockReturnValue(true);

      await expect(provider.chat(messages)).rejects.toThrow(AuthenticationError);
      expect(mockPost).toHaveBeenCalledTimes(1);
    });
  });

  describe('stream', () => {
    it('should stream chat responses', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Count to 3' }];

      const streamData = [
        JSON.stringify({ message: { content: 'One' }, done: false }) + '\n',
        JSON.stringify({ message: { content: ' two' }, done: false }) + '\n',
        JSON.stringify({ message: { content: ' three' }, done: true }) + '\n',
      ];

      async function* mockStream() {
        for (const chunk of streamData) {
          yield Buffer.from(chunk);
        }
      }

      mockPost.mockResolvedValue({
        data: mockStream(),
      });

      const chunks: string[] = [];
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['One', ' two', ' three']);
      expect(mockPost).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          stream: true,
        }),
        { responseType: 'stream' }
      );
    });

    it('should handle incomplete JSON chunks', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const streamData = [
        '{"message": {"content": "Hel',
        'lo"}, "done": false}\n{"message": {"content": " world"}, "done": true}\n',
      ];

      async function* mockStream() {
        for (const chunk of streamData) {
          yield Buffer.from(chunk);
        }
      }

      mockPost.mockResolvedValue({
        data: mockStream(),
      });

      const chunks: string[] = [];
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('should skip invalid JSON lines', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const streamData = [
        'invalid json\n',
        JSON.stringify({ message: { content: 'Valid' }, done: false }) + '\n',
        'another invalid\n',
        JSON.stringify({ message: { content: ' response' }, done: true }) + '\n',
      ];

      async function* mockStream() {
        for (const chunk of streamData) {
          yield Buffer.from(chunk);
        }
      }

      mockPost.mockResolvedValue({
        data: mockStream(),
      });

      const chunks: string[] = [];
      for await (const chunk of provider.stream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Valid', ' response']);
    });

    it('should handle streaming errors', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const error: any = new Error('Stream error');
      error.isAxiosError = true;
      error.code = 'ECONNREFUSED';
      mockPost.mockRejectedValue(error);

      const { isAxiosError } = await import('axios');
      (isAxiosError as any).mockReturnValue(true);

      const generator = provider.stream(messages);
      await expect(generator.next()).rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe('error handling', () => {
    it('should extract error message from response data string', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const error: any = new Error('Request failed');
      error.isAxiosError = true;
      error.response = {
        status: 500,
        data: 'Internal server error',
      };
      mockPost.mockRejectedValue(error);

      const { isAxiosError } = await import('axios');
      (isAxiosError as any).mockReturnValue(true);

      await expect(provider.chat(messages)).rejects.toThrow('Internal server error');
    });

    it('should extract error message from response data object', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

      const error: any = new Error('Request failed');
      error.isAxiosError = true;
      error.response = {
        status: 500,
        data: { message: 'Custom error message' },
      };
      mockPost.mockRejectedValue(error);

      const { isAxiosError } = await import('axios');
      (isAxiosError as any).mockReturnValue(true);

      await expect(provider.chat(messages)).rejects.toThrow('Custom error message');
    });
  });
});
