import type { ChatMessage, ChatOptions, ChatResponse, LLMConfig } from '../llm/types';
import { LLMError, LLMTimeoutError, LLMRateLimitError } from '../llm/types';
import { ProviderFactory } from '../llm/ProviderFactory';
import { logger } from '../utils/logger';

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface LLMRequestLog {
  requestId: string;
  timestamp: Date;
  provider: string;
  model: string;
  messages: ChatMessage[];
  options?: ChatOptions;
  response?: ChatResponse;
  error?: string;
  duration: number;
}

export class LLMService {
  private static requestCounter = 0;
  private static requestLogs: LLMRequestLog[] = [];
  private static tokenUsage = {
    total: 0,
    byProvider: new Map<string, number>(),
  };

  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  private defaultTimeout = 60000;

  constructor(
    private config: LLMConfig,
    private retryConfig: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    }
  ) {}

  async generateResponse(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    logger.info('LLM request started', {
      requestId,
      provider: this.config.provider,
      model: this.config.model,
      messageCount: messages.length,
    });

    try {
      const response = await this.executeWithRetry(messages, options, requestId);
      
      const duration = Date.now() - startTime;
      this.logRequest(requestId, messages, options, response, duration);
      this.trackTokenUsage(response);

      logger.info('LLM request completed', {
        requestId,
        duration,
        tokens: response.usage.totalTokens,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logRequest(requestId, messages, options, undefined, duration, errorMessage);

      logger.error('LLM request failed', {
        requestId,
        error: errorMessage,
        duration,
      });

      throw error;
    }
  }

  private async executeWithRetry(
    messages: ChatMessage[],
    options: ChatOptions | undefined,
    requestId: string,
    attempt = 1
  ): Promise<ChatResponse> {
    try {
      return await this.executeWithTimeout(messages, options);
    } catch (error) {
      if (attempt >= this.retryConfig.maxRetries) {
        throw error;
      }

      if (error instanceof LLMError && !error.retryable) {
        throw error;
      }

      const delay = this.calculateBackoffDelay(attempt);
      
      logger.warn('LLM request failed, retrying', {
        requestId,
        attempt,
        nextAttempt: attempt + 1,
        delayMs: delay,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.sleep(delay);
      return this.executeWithRetry(messages, options, requestId, attempt + 1);
    }
  }

  private async executeWithTimeout(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const provider = ProviderFactory.getProvider(this.config);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new LLMTimeoutError(this.config.provider, timeout));
      }, timeout);
    });

    const requestPromise = provider.chat(messages, {
      ...options,
      model: options?.model ?? this.config.model,
    });

    return Promise.race([requestPromise, timeoutPromise]);
  }

  private calculateBackoffDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelayMs
    );
    
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    LLMService.requestCounter++;
    return `llm-${Date.now()}-${LLMService.requestCounter}`;
  }

  private logRequest(
    requestId: string,
    messages: ChatMessage[],
    options: ChatOptions | undefined,
    response: ChatResponse | undefined,
    duration: number,
    error?: string
  ): void {
    const log: LLMRequestLog = {
      requestId,
      timestamp: new Date(),
      provider: this.config.provider,
      model: this.config.model,
      messages,
      options,
      response,
      error,
      duration,
    };

    LLMService.requestLogs.push(log);

    if (LLMService.requestLogs.length > 1000) {
      LLMService.requestLogs.shift();
    }
  }

  private trackTokenUsage(response: ChatResponse): void {
    const tokens = response.usage.totalTokens;
    LLMService.tokenUsage.total += tokens;

    const providerKey = `${this.config.provider}:${this.config.model}`;
    const currentUsage = LLMService.tokenUsage.byProvider.get(providerKey) || 0;
    LLMService.tokenUsage.byProvider.set(providerKey, currentUsage + tokens);
  }

  static getRequestLogs(): LLMRequestLog[] {
    return [...LLMService.requestLogs];
  }

  static getTokenUsage() {
    return {
      total: LLMService.tokenUsage.total,
      byProvider: Object.fromEntries(LLMService.tokenUsage.byProvider),
    };
  }

  static clearLogs(): void {
    LLMService.requestLogs = [];
  }

  static resetTokenUsage(): void {
    LLMService.tokenUsage.total = 0;
    LLMService.tokenUsage.byProvider.clear();
  }
}
