import type { LLMProvider, ChatMessage, ChatOptions, ChatResponse } from '@obsidian/core';

export interface OpenRouterConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
  siteUrl?: string;
  siteName?: string;
  providerPreferences?: {
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: 'allow' | 'deny';
    order?: string[];
  };
}

export class OpenRouterProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly defaultModel: string;
  private readonly siteUrl?: string;
  private readonly siteName?: string;
  private readonly providerPreferences?: OpenRouterConfig['providerPreferences'];

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL ?? 'https://openrouter.ai/api/v1';
    this.defaultModel = config.defaultModel ?? 'openai/gpt-4o';
    this.siteUrl = config.siteUrl;
    this.siteName = config.siteName;
    this.providerPreferences = config.providerPreferences ?? {
      allow_fallbacks: true,
      require_parameters: false,
    };
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.siteUrl) headers['HTTP-Referer'] = this.siteUrl;
    if (this.siteName) headers['X-Title'] = this.siteName;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options?.model ?? this.defaultModel,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        stop: options?.stopSequences,
        provider: this.providerPreferences,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error: ${response.status} ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json() as {
      choices: Array<{
        message: { content: string };
        finish_reason: string;
        native_finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        cost?: number;
      };
      model: string;
    };
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens ?? 0,
        completionTokens: data.usage.completion_tokens ?? 0,
        totalTokens: data.usage.total_tokens ?? 0,
      } : undefined,
      finishReason: choice.finish_reason,
      metadata: {
        model: data.model,
        provider: 'openrouter',
        cost: data.usage?.cost,
        nativeFinishReason: choice.native_finish_reason,
      },
    };
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterableIterator<string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.siteUrl) headers['HTTP-Referer'] = this.siteUrl;
    if (this.siteName) headers['X-Title'] = this.siteName;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options?.model ?? this.defaultModel,
        messages: messages.map(msg => ({ 
          role: msg.role, 
          content: msg.content 
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        stop: options?.stopSequences,
        stream: true,
        provider: this.providerPreferences,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter stream error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from OpenRouter stream');
    }

    yield* this.parseSSEStream(response.body);
  }

  private async *parseSSEStream(body: ReadableStream<Uint8Array>): AsyncIterableIterator<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') return;
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch (e) {
              // Ignore parse errors for comments or malformed data
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
