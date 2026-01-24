import type { LLMProvider, ChatMessage, ChatOptions, ChatResponse, LLMConfig } from '@obsidian/core';
import { ProviderFactory } from '../llm/ProviderFactory';

export interface LLMRequestLog {
  id: string;
  userId: string;
  provider: string;
  model: string;
  messages: ChatMessage[];
  response?: ChatResponse;
  error?: string;
  duration: number;
  timestamp: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMServiceConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  enableLogging?: boolean;
}

export class LLMServiceError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'LLMServiceError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class LLMService {
  private logs: LLMRequestLog[] = [];
  private config: Required<LLMServiceConfig>;

  constructor(config: LLMServiceConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      timeout: config.timeout ?? 60000,
      enableLogging: config.enableLogging ?? true,
    };
  }

  async generateResponse(
    llmConfig: LLMConfig,
    messages: ChatMessage[],
    options?: ChatOptions,
    userId?: string
  ): Promise<ChatResponse> {
    const provider = await ProviderFactory.createProvider(llmConfig);
    const startTime = Date.now();
    const logId = this.generateLogId();

    try {
      const response = await this.executeWithRetry(provider, messages, options);
      const duration = Date.now() - startTime;

      if (this.config.enableLogging) {
        this.logRequest({
          id: logId,
          userId: userId || 'unknown',
          provider: llmConfig.provider,
          model: llmConfig.model,
          messages,
          response,
          duration,
          timestamp: startTime,
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (this.config.enableLogging) {
        this.logRequest({
          id: logId,
          userId: userId || 'unknown',
          provider: llmConfig.provider,
          model: llmConfig.model,
          messages,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
          timestamp: startTime,
        });
      }

      throw new LLMServiceError(
        `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateResponseWithFallback(
    primaryConfig: LLMConfig,
    fallbackConfig: LLMConfig,
    messages: ChatMessage[],
    options?: ChatOptions,
    userId?: string
  ): Promise<ChatResponse> {
    const providerWithFallback = await ProviderFactory.createWithFallback({
      primaryConfig,
      fallbackConfig,
    });

    const startTime = Date.now();
    const logId = this.generateLogId();

    try {
      const response = await this.executeWithTimeout(
        () => providerWithFallback.chat(messages, options),
        this.config.timeout
      );
      const duration = Date.now() - startTime;

      if (this.config.enableLogging) {
        this.logRequest({
          id: logId,
          userId: userId || 'unknown',
          provider: `${primaryConfig.provider} (with fallback: ${fallbackConfig.provider})`,
          model: primaryConfig.model,
          messages,
          response,
          duration,
          timestamp: startTime,
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (this.config.enableLogging) {
        this.logRequest({
          id: logId,
          userId: userId || 'unknown',
          provider: `${primaryConfig.provider} (with fallback: ${fallbackConfig.provider})`,
          model: primaryConfig.model,
          messages,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
          timestamp: startTime,
        });
      }

      throw new LLMServiceError(
        `Failed to generate response with fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  getTokenUsage(): TokenUsage {
    return this.logs.reduce(
      (acc, log) => {
        if (log.response?.usage) {
          acc.promptTokens += log.response.usage.promptTokens;
          acc.completionTokens += log.response.usage.completionTokens;
          acc.totalTokens += log.response.usage.totalTokens;
        }
        return acc;
      },
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );
  }

  getTokenUsageByUser(userId: string): TokenUsage {
    return this.logs
      .filter((log) => log.userId === userId)
      .reduce(
        (acc, log) => {
          if (log.response?.usage) {
            acc.promptTokens += log.response.usage.promptTokens;
            acc.completionTokens += log.response.usage.completionTokens;
            acc.totalTokens += log.response.usage.totalTokens;
          }
          return acc;
        },
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      );
  }

  getLogs(): LLMRequestLog[] {
    return [...this.logs];
  }

  getLogsByUser(userId: string): LLMRequestLog[] {
    return this.logs.filter((log) => log.userId === userId);
  }

  clearLogs(): void {
    this.logs = [];
  }

  private async executeWithRetry(
    provider: LLMProvider,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.executeWithTimeout(
          () => provider.chat(messages, options),
          this.config.timeout
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed after all retry attempts');
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private logRequest(log: LLMRequestLog): void {
    this.logs.push(log);
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
