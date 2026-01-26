export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeout?: number;
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface LLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterator<string>;
}

export type LLMProviderType = 'openai' | 'anthropic' | 'ollama';

export interface LLMConfig {
  id: string;
  provider: LLMProviderType;
  model: string;
  apiKey?: string;
  endpoint?: string;
  isDefault: boolean;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: LLMProviderType,
    public readonly code?: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(provider: LLMProviderType, timeoutMs: number) {
    super(`LLM request timed out after ${timeoutMs}ms`, provider, 'TIMEOUT', true);
    this.name = 'LLMTimeoutError';
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(provider: LLMProviderType) {
    super('Rate limit exceeded', provider, 'RATE_LIMIT', true);
    this.name = 'LLMRateLimitError';
  }
}
