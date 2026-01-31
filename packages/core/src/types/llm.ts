export type LLMProviderName = 'openai' | 'anthropic' | 'ollama' | 'openrouter';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  model?: string;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  metadata?: {
    model?: string;
    provider?: string;
    cost?: number;
    nativeFinishReason?: string;
    [key: string]: unknown;
  };
}

export interface LLMConfig {
  id: string;
  userId: string;
  provider: LLMProviderName;
  model: string;
  apiKey?: string;
  endpoint?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
