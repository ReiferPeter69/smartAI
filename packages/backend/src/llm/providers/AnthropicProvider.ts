import Anthropic from '@anthropic-ai/sdk';
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

const PROVIDER_NAME = 'anthropic';
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

interface APIErrorLike {
  message: string;
  headers?: Record<string, string | null | undefined>;
}

export interface AnthropicProviderConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: string;
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private maxRetries: number;
  private defaultModel: string;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({
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
        const { system, conversationMessages } = this.prepareMessages(messages);

        const response = await this.client.messages.create({
          model,
          max_tokens: options?.maxTokens ?? 4096,
          system,
          messages: conversationMessages,
          temperature: options?.temperature,
          stop_sequences: options?.stopSequences,
        });

        const textContent = response.content.find((block) => block.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new LLMError('No text response from Anthropic', PROVIDER_NAME);
        }

        return {
          content: textContent.text,
          usage: {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          },
          finishReason: response.stop_reason ?? undefined,
        };
      } catch (error) {
        throw this.mapError(error);
      }
    });
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterableIterator<string> {
    const model = options?.model ?? this.defaultModel;

    const streamResponse = await this.withRetry(async () => {
      try {
        const { system, conversationMessages } = this.prepareMessages(messages);

        return await this.client.messages.stream({
          model,
          max_tokens: options?.maxTokens ?? 4096,
          system,
          messages: conversationMessages,
          temperature: options?.temperature,
          stop_sequences: options?.stopSequences,
        });
      } catch (error) {
        throw this.mapError(error);
      }
    });

    try {
      for await (const chunk of streamResponse) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private prepareMessages(messages: ChatMessage[]): {
    system?: string;
    conversationMessages: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
  } {
    const systemMessage = messages.find((msg) => msg.role === 'system');
    const conversationMessages = messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    return {
      system: systemMessage?.content,
      conversationMessages,
    };
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

    if (error instanceof Anthropic.APIError) {
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

  private extractRetryAfter(error: APIErrorLike): number | undefined {
    const retryAfterHeader = error.headers?.['retry-after'];
    if (typeof retryAfterHeader === 'string') {
      const seconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(seconds)) {
        return seconds;
      }
    }
    return undefined;
  }

  private extractModelFromError(error: APIErrorLike): string | undefined {
    const match = error.message.match(/model[:\s]+['"]?([^'">\s]+)['"]?/i);
    return match?.[1];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
