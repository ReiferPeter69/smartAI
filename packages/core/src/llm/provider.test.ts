import { describe, it, expect } from 'vitest';
import {
  LLMProvider,
  LLMError,
  RateLimitError,
  AuthenticationError,
  InvalidRequestError,
  ModelNotFoundError,
  TimeoutError,
  ServiceUnavailableError,
} from './provider';
import type { ChatMessage, ChatOptions, ChatResponse } from '../types/llm';

describe('LLMProvider Interface', () => {
  it('should define chat method signature', () => {
    const mockProvider: LLMProvider = {
      chat: async (_messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResponse> => {
        return {
          content: 'Mock response',
          usage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
          },
        };
      },
      stream: async function* (_messages: ChatMessage[], _options?: ChatOptions): AsyncIterator<string> {
        yield 'Mock';
        yield ' stream';
      },
    };

    expect(mockProvider.chat).toBeDefined();
    expect(typeof mockProvider.chat).toBe('function');
  });

  it('should define stream method signature', () => {
    const mockProvider: LLMProvider = {
      chat: async () => ({ content: '' }),
      stream: async function* (): AsyncIterator<string> {
        yield 'test';
      },
    };

    expect(mockProvider.stream).toBeDefined();
    expect(typeof mockProvider.stream).toBe('function');
  });
});

describe('LLMError', () => {
  it('should create LLMError with all properties', () => {
    const error = new LLMError('Test error', 'openai', 500, new Error('Original'));

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(LLMError);
    expect(error.name).toBe('LLMError');
    expect(error.message).toBe('Test error');
    expect(error.provider).toBe('openai');
    expect(error.statusCode).toBe(500);
    expect(error.originalError).toBeInstanceOf(Error);
  });

  it('should create LLMError without optional properties', () => {
    const error = new LLMError('Test error', 'anthropic');

    expect(error.provider).toBe('anthropic');
    expect(error.statusCode).toBeUndefined();
    expect(error.originalError).toBeUndefined();
  });
});

describe('RateLimitError', () => {
  it('should create RateLimitError with retryAfter', () => {
    const error = new RateLimitError('openai', 60);

    expect(error).toBeInstanceOf(LLMError);
    expect(error.name).toBe('RateLimitError');
    expect(error.message).toContain('Rate limit exceeded');
    expect(error.provider).toBe('openai');
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBe(60);
  });

  it('should create RateLimitError without retryAfter', () => {
    const error = new RateLimitError('anthropic');

    expect(error.retryAfter).toBeUndefined();
    expect(error.message).toContain('Rate limit exceeded');
  });
});

describe('AuthenticationError', () => {
  it('should create AuthenticationError', () => {
    const error = new AuthenticationError('openai');

    expect(error).toBeInstanceOf(LLMError);
    expect(error.name).toBe('AuthenticationError');
    expect(error.message).toContain('Authentication failed');
    expect(error.provider).toBe('openai');
    expect(error.statusCode).toBe(401);
  });
});

describe('InvalidRequestError', () => {
  it('should create InvalidRequestError with custom message', () => {
    const error = new InvalidRequestError('ollama', 'Missing required field: model');

    expect(error).toBeInstanceOf(LLMError);
    expect(error.name).toBe('InvalidRequestError');
    expect(error.message).toContain('Invalid request');
    expect(error.message).toContain('Missing required field: model');
    expect(error.provider).toBe('ollama');
    expect(error.statusCode).toBe(400);
  });
});

describe('ModelNotFoundError', () => {
  it('should create ModelNotFoundError', () => {
    const error = new ModelNotFoundError('openai', 'gpt-5');

    expect(error).toBeInstanceOf(LLMError);
    expect(error.name).toBe('ModelNotFoundError');
    expect(error.message).toContain("Model 'gpt-5' not found");
    expect(error.provider).toBe('openai');
    expect(error.model).toBe('gpt-5');
    expect(error.statusCode).toBe(404);
  });
});

describe('TimeoutError', () => {
  it('should create TimeoutError', () => {
    const error = new TimeoutError('anthropic', 30000);

    expect(error).toBeInstanceOf(LLMError);
    expect(error.name).toBe('TimeoutError');
    expect(error.message).toContain('Request timeout after 30000ms');
    expect(error.provider).toBe('anthropic');
    expect(error.timeoutMs).toBe(30000);
    expect(error.statusCode).toBe(408);
  });
});

describe('ServiceUnavailableError', () => {
  it('should create ServiceUnavailableError', () => {
    const error = new ServiceUnavailableError('ollama');

    expect(error).toBeInstanceOf(LLMError);
    expect(error.name).toBe('ServiceUnavailableError');
    expect(error.message).toContain('Service unavailable');
    expect(error.provider).toBe('ollama');
    expect(error.statusCode).toBe(503);
  });
});

describe('Error Inheritance Chain', () => {
  it('should maintain proper inheritance for all error types', () => {
    const errors = [
      new RateLimitError('test'),
      new AuthenticationError('test'),
      new InvalidRequestError('test', 'message'),
      new ModelNotFoundError('test', 'model'),
      new TimeoutError('test', 5000),
      new ServiceUnavailableError('test'),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LLMError);
      expect(error.stack).toBeDefined();
    });
  });
});
