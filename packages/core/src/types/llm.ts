export type LLMProvider = 'openai' | 'anthropic' | 'ollama';

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
}

export interface LLMConfig {
  id: string;
  userId: string;
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  endpoint?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterator<string>;
}
