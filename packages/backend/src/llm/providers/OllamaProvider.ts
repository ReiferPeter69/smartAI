import axios, { AxiosInstance, AxiosError } from 'axios';
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

const PROVIDER_NAME = 'ollama';
const DEFAULT_MODEL = 'llama3';
const DEFAULT_ENDPOINT = 'http://localhost:11434';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

export interface OllamaProviderConfig {
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: string;
}

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    stop?: string[];
  };
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements LLMProvider {
  private client: AxiosInstance;
  private maxRetries: number;
  private defaultModel: string;

  constructor(config: OllamaProviderConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseURL ?? DEFAULT_ENDPOINT,
      timeout: config.timeout ?? 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.maxRetries = config.maxRetries ?? MAX_RETRIES;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const model = options?.model ?? this.defaultModel;

    return this.withRetry(async () => {
      try {
        const request: OllamaChatRequest = {
          model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: false,
          options: {
            temperature: options?.temperature,
            num_predict: options?.maxTokens,
            stop: options?.stopSequences,
          },
        };

        const response = await this.client.post<OllamaChatResponse>('/api/chat', request);

        if (!response.data.message) {
          throw new LLMError('No message in response from Ollama', PROVIDER_NAME);
        }

        return {
          content: response.data.message.content,
          usage: response.data.prompt_eval_count
            ? {
                promptTokens: response.data.prompt_eval_count ?? 0,
                completionTokens: response.data.eval_count ?? 0,
                totalTokens: (response.data.prompt_eval_count ?? 0) + (response.data.eval_count ?? 0),
              }
            : undefined,
          finishReason: response.data.done ? 'stop' : 'length',
        };
      } catch (error) {
        throw this.mapError(error);
      }
    });
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterableIterator<string> {
    const model = options?.model ?? this.defaultModel;

    const request: OllamaChatRequest = {
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
      options: {
        temperature: options?.temperature,
        num_predict: options?.maxTokens,
        stop: options?.stopSequences,
      },
    };

    try {
      const response = await this.withRetry(async () => {
        return await this.client.post<ReadableStream>('/api/chat', request, {
          responseType: 'stream',
        });
      });

      const stream = response.data as any;

      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data: OllamaChatResponse = JSON.parse(line);
              if (data.message?.content) {
                yield data.message.content;
              }
            } catch (parseError) {
              continue;
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          const data: OllamaChatResponse = JSON.parse(buffer);
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch (parseError) {
          // Ignore final parse error
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

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return true;
      }
    }

    return false;
  }

  private mapError(error: unknown): Error {
    if (error instanceof LLMError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        return new ServiceUnavailableError(
          PROVIDER_NAME,
          new Error(`Cannot connect to Ollama server. Please ensure Ollama is running.`)
        );
      }

      if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
        return new TimeoutError(PROVIDER_NAME, 60000, error);
      }

      const status = axiosError.response?.status;

      if (status === 401 || status === 403) {
        return new AuthenticationError(PROVIDER_NAME, error);
      }

      if (status === 429) {
        const retryAfter = this.extractRetryAfter(axiosError);
        return new RateLimitError(PROVIDER_NAME, retryAfter, error);
      }

      if (status === 400) {
        const message = this.extractErrorMessage(axiosError);
        return new InvalidRequestError(PROVIDER_NAME, message, error);
      }

      if (status === 404) {
        const message = this.extractErrorMessage(axiosError);
        const model = this.extractModelFromMessage(message);
        return new ModelNotFoundError(PROVIDER_NAME, model, error);
      }

      if (status && status >= 500) {
        return new ServiceUnavailableError(PROVIDER_NAME, error);
      }

      const message = this.extractErrorMessage(axiosError);
      return new LLMError(message, PROVIDER_NAME, status, error);
    }

    if (error instanceof Error) {
      return new LLMError(error.message, PROVIDER_NAME, undefined, error);
    }

    return new LLMError('Unknown error occurred', PROVIDER_NAME, undefined, error);
  }

  private extractRetryAfter(error: AxiosError): number | undefined {
    const retryAfterHeader = error.response?.headers?.['retry-after'];
    if (typeof retryAfterHeader === 'string') {
      const seconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(seconds)) {
        return seconds;
      }
    }
    return undefined;
  }

  private extractErrorMessage(error: AxiosError): string {
    if (error.response?.data) {
      const data = error.response.data as any;
      if (typeof data === 'string') {
        return data;
      }
      if (data.error) {
        return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      }
      if (data.message) {
        return data.message;
      }
    }
    return error.message || 'Unknown error';
  }

  private extractModelFromMessage(message: string): string {
    const match = message.match(/model[:\s]+['"]?([^'">\s]+)['"]?/i);
    return match?.[1] ?? 'unknown';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
