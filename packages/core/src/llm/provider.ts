import type { ChatMessage, ChatOptions, ChatResponse } from '../types/llm';

export interface LLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterableIterator<string>;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'LLMError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RateLimitError extends LLMError {
  constructor(
    provider: string,
    public readonly retryAfter?: number,
    originalError?: unknown
  ) {
    super(`Rate limit exceeded for provider: ${provider}`, provider, 429, originalError);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends LLMError {
  constructor(provider: string, originalError?: unknown) {
    super(`Authentication failed for provider: ${provider}`, provider, 401, originalError);
    this.name = 'AuthenticationError';
  }
}

export class InvalidRequestError extends LLMError {
  constructor(provider: string, message: string, originalError?: unknown) {
    super(`Invalid request to ${provider}: ${message}`, provider, 400, originalError);
    this.name = 'InvalidRequestError';
  }
}

export class ModelNotFoundError extends LLMError {
  constructor(
    provider: string,
    public readonly model: string,
    originalError?: unknown
  ) {
    super(`Model '${model}' not found for provider: ${provider}`, provider, 404, originalError);
    this.name = 'ModelNotFoundError';
  }
}

export class TimeoutError extends LLMError {
  constructor(provider: string, public readonly timeoutMs: number, originalError?: unknown) {
    super(`Request timeout after ${timeoutMs}ms for provider: ${provider}`, provider, 408, originalError);
    this.name = 'TimeoutError';
  }
}

export class ServiceUnavailableError extends LLMError {
  constructor(provider: string, originalError?: unknown) {
    super(`Service unavailable for provider: ${provider}`, provider, 503, originalError);
    this.name = 'ServiceUnavailableError';
  }
}
