import type { LLMProvider, LLMConfig, LLMProviderType } from './types';
import { LLMError } from './types';

export class ProviderFactory {
  private static providers = new Map<string, LLMProvider>();

  static registerProvider(configId: string, provider: LLMProvider): void {
    this.providers.set(configId, provider);
  }

  static getProvider(config: LLMConfig): LLMProvider {
    const provider = this.providers.get(config.id);
    
    if (!provider) {
      throw new LLMError(
        `No provider registered for config ID: ${config.id}`,
        config.provider,
        'PROVIDER_NOT_FOUND',
        false
      );
    }

    return provider;
  }

  static createProvider(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'openai':
        throw new LLMError(
          'OpenAI provider not implemented yet',
          'openai',
          'NOT_IMPLEMENTED',
          false
        );
      case 'anthropic':
        throw new LLMError(
          'Anthropic provider not implemented yet',
          'anthropic',
          'NOT_IMPLEMENTED',
          false
        );
      case 'ollama':
        throw new LLMError(
          'Ollama provider not implemented yet',
          'ollama',
          'NOT_IMPLEMENTED',
          false
        );
      default:
        throw new LLMError(
          `Unknown provider type: ${config.provider}`,
          config.provider,
          'INVALID_PROVIDER',
          false
        );
    }
  }

  static hasProvider(configId: string): boolean {
    return this.providers.has(configId);
  }

  static clear(): void {
    this.providers.clear();
  }
}
