import type { LLMProvider } from '@obsidian/core';
import type { LLMConfig } from '@obsidian/core';

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConfigurationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ProviderFactoryOptions {
  primaryConfig: LLMConfig;
  fallbackConfig?: LLMConfig;
}

export class ProviderFactory {
  static async createProvider(config: LLMConfig): Promise<LLMProvider> {
    this.validateConfig(config);

    switch (config.provider) {
      case 'openai': {
        const { OpenAIProvider } = await import('./providers/OpenAIProvider');
        if (!config.apiKey) {
          throw new ProviderConfigurationError('OpenAI requires an API key');
        }
        return new OpenAIProvider({
          apiKey: config.apiKey,
          baseURL: config.endpoint,
          defaultModel: config.model,
        });
      }

      case 'anthropic': {
        const { AnthropicProvider } = await import('./providers/AnthropicProvider');
        if (!config.apiKey) {
          throw new ProviderConfigurationError('Anthropic requires an API key');
        }
        return new AnthropicProvider({
          apiKey: config.apiKey,
          baseURL: config.endpoint,
          defaultModel: config.model,
        });
      }

      case 'ollama': {
        const { OllamaProvider } = await import('./providers/OllamaProvider');
        return new OllamaProvider({
          baseURL: config.endpoint ?? 'http://localhost:11434',
          defaultModel: config.model,
        });
      }

      default:
        throw new ProviderConfigurationError(
          `Unsupported provider: ${(config as LLMConfig).provider}`
        );
    }
  }

  static async createWithFallback(options: ProviderFactoryOptions): Promise<ProviderWithFallback> {
    const primaryProvider = await this.createProvider(options.primaryConfig);
    const fallbackProvider = options.fallbackConfig
      ? await this.createProvider(options.fallbackConfig)
      : undefined;

    return new ProviderWithFallback(
      primaryProvider,
      fallbackProvider,
      options.primaryConfig.provider,
      options.fallbackConfig?.provider
    );
  }

  private static validateConfig(config: LLMConfig): void {
    if (!config.provider) {
      throw new ProviderConfigurationError('Provider is required');
    }

    if (!config.model) {
      throw new ProviderConfigurationError('Model is required');
    }

    switch (config.provider) {
      case 'openai':
        if (!config.apiKey) {
          throw new ProviderConfigurationError('OpenAI requires an API key');
        }
        break;

      case 'anthropic':
        if (!config.apiKey) {
          throw new ProviderConfigurationError('Anthropic requires an API key');
        }
        break;

      case 'ollama':
        if (!config.endpoint) {
          throw new ProviderConfigurationError('Ollama requires an endpoint');
        }
        break;

      default:
        throw new ProviderConfigurationError(
          `Unknown provider: ${(config as LLMConfig).provider}`
        );
    }
  }
}

export class ProviderWithFallback implements LLMProvider {
  private useFallback = false;

  constructor(
    private primaryProvider: LLMProvider,
    private fallbackProvider: LLMProvider | undefined,
    private primaryName: string,
    private fallbackName?: string
  ) {}

  async chat(
    messages: import('@obsidian/core').ChatMessage[],
    options?: import('@obsidian/core').ChatOptions
  ): Promise<import('@obsidian/core').ChatResponse> {
    if (this.useFallback && this.fallbackProvider) {
      return this.fallbackProvider.chat(messages, options);
    }

    try {
      return await this.primaryProvider.chat(messages, options);
    } catch (error) {
      if (this.shouldFallback(error)) {
        console.warn(
          `Primary provider ${this.primaryName} failed, attempting fallback to ${this.fallbackName}`
        );
        if (!this.fallbackProvider) {
          throw error;
        }
        this.useFallback = true;
        return this.fallbackProvider.chat(messages, options);
      }
      throw error;
    }
  }

  async *stream(
    messages: import('@obsidian/core').ChatMessage[],
    options?: import('@obsidian/core').ChatOptions
  ): AsyncIterableIterator<string> {
    if (this.useFallback && this.fallbackProvider) {
      yield* this.fallbackProvider.stream(messages, options);
      return;
    }

    try {
      yield* this.primaryProvider.stream(messages, options);
    } catch (error) {
      if (this.shouldFallback(error)) {
        console.warn(
          `Primary provider ${this.primaryName} failed during streaming, attempting fallback to ${this.fallbackName}`
        );
        if (!this.fallbackProvider) {
          throw error;
        }
        this.useFallback = true;
        yield* this.fallbackProvider.stream(messages, options);
        return;
      }
      throw error;
    }
  }

  resetFallback(): void {
    this.useFallback = false;
  }

  private shouldFallback(error: unknown): boolean {
    if (!this.fallbackProvider) {
      return false;
    }

    if (error instanceof Error) {
      const errorName = error.name;
      const shouldFallback =
        errorName === 'RateLimitError' ||
        errorName === 'ServiceUnavailableError' ||
        errorName === 'TimeoutError';

      return shouldFallback;
    }

    return false;
  }
}
