import OpenAI from 'openai';
import type { ChatMessage, ChatOptions, ChatResponse } from '@obsidian/core';
import {
  LLMProvider,
  LLMError,
  RateLimitError,
  AuthenticationError,
  InvalidRequestError,
  ModelNotFoundError,
  TimeoutError,
  ServiceUnavailableError,
} from '@obsidian/core';

const PROVIDER_NAME = 'openai';
const DEFAULT_MODEL = 'gpt-4-turbo-preview';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

export interface OpenAIProviderConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: string;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private maxRetries: number;
  private defaultModel: string;

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout ?? 60000,
      maxRetries: 0,
    });
    this.maxRetries = config.maxRetries ?? MAX_RETRIES;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const model = options?.model ?? this.defaultModel;

    return this.withRetry(async () => {
      try {
        const response = await this.client.chat.completions.create({
          model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          stop: options?.stopSequences,
        });

        const choice = response.choices[0];
        if (!choice) {
          throw new LLMError('No response from OpenAI', PROVIDER_NAME);
        }

        return {
          content: choice.message.content ?? '',
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
              }
            : undefined,
          finishReason: choice.finish_reason,
        };
      } catch (error) {
        throw this.mapError(error);
      }
    });
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterator<string> {
    const model = options?.model ?? this.defaultModel;

    const streamResponse = await this.withRetry(async () => {
      try {
        return await this.client.chat.completions.create({
          model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          stop: options?.stopSequences,
          stream: true,
        });
      } catch (error) {
        throw this.mapError(error);
      }
    });

    try {
      for await (const chunk of streamResponse) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    let delay = INITIAL_RETRY_DELAY_MS;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryable(error)) {
          throw error;
        }

        if (attempt === this.maxRetries) {
          break;
        }

        if (error instanceof RateLimitError && error.retryAfter) {
          delay = error.retryAfter * 1000;
        }

        await this.sleep(delay);
        delay *= 2;
      }
    }

    throw lastError;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof RateLimitError) return true;
    if (error instanceof ServiceUnavailableError) return true;
    if (error instanceof TimeoutError) return true;

    if (error instanceof LLMError && error.statusCode) {
      return error.statusCode >= 500 && error.statusCode < 600;
    }

    return false;
  }

  private mapError(error: unknown): Error {
    if (error instanceof LLMError) {
      return error;
    }

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return new AuthenticationError(PROVIDER_NAME, error);
      }

      if (error.status === 429) {
        const retryAfter = this.extractRetryAfter(error);
        return new RateLimitError(PROVIDER_NAME, retryAfter, error);
      }

      if (error.status === 400) {
        return new InvalidRequestError(PROVIDER_NAME, error.message, error);
      }

      if (error.status === 404) {
        const model = this.extractModelFromError(error);
        return new ModelNotFoundError(PROVIDER_NAME, model ?? 'unknown', error);
      }

      if (error.status && error.status >= 500) {
        return new ServiceUnavailableError(PROVIDER_NAME, error);
      }

      return new LLMError(error.message, PROVIDER_NAME, error.status, error);
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return new TimeoutError(PROVIDER_NAME, 60000, error);
      }

      return new LLMError(error.message, PROVIDER_NAME, undefined, error);
    }

    return new LLMError('Unknown error occurred', PROVIDER_NAME, undefined, error);
  }

  private extractRetryAfter(error: OpenAI.APIError): number | undefined {
    const retryAfterHeader = error.headers?.['retry-after'];
    if (typeof retryAfterHeader === 'string') {
      const seconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(seconds)) {
        return seconds;
      }
    }
    return undefined;
  }

  private extractModelFromError(error: OpenAI.APIError): string | undefined {
    const match = error.message.match(/model[:\s]+['"]?([^'">\s]+)['"]?/i);
    return match?.[1];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
