import { describe, it, expect, vi } from 'vitest';
import {
  ProviderFactory,
  ProviderConfigurationError,
  ProviderWithFallback,
} from './ProviderFactory';
import type { LLMConfig } from '@obsidian/core';

describe('ProviderFactory - Validation', () => {
  describe('configuration validation', () => {
    it('throws error for missing OpenAI API key', async () => {
      const config: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(ProviderFactory.createProvider(config)).rejects.toThrow(
        ProviderConfigurationError
      );
      await expect(ProviderFactory.createProvider(config)).rejects.toThrow(
        'OpenAI requires an API key'
      );
    });

    it('throws error for missing Anthropic API key', async () => {
      const config: LLMConfig = {
        id: '2',
        userId: 'user1',
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(ProviderFactory.createProvider(config)).rejects.toThrow(
        ProviderConfigurationError
      );
      await expect(ProviderFactory.createProvider(config)).rejects.toThrow(
        'Anthropic requires an API key'
      );
    });

    it('throws error for missing provider', async () => {
      const config = {
        id: '4',
        userId: 'user1',
        model: 'gpt-4',
        apiKey: 'test-api-key',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as LLMConfig;

      await expect(ProviderFactory.createProvider(config)).rejects.toThrow(
        ProviderConfigurationError
      );
      await expect(ProviderFactory.createProvider(config)).rejects.toThrow('Provider is required');
    });

    it('throws error for missing model', async () => {
      const config = {
        id: '5',
        userId: 'user1',
        provider: 'openai',
        apiKey: 'test-api-key',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as LLMConfig;

      await expect(ProviderFactory.createProvider(config)).rejects.toThrow(
        ProviderConfigurationError
      );
      await expect(ProviderFactory.createProvider(config)).rejects.toThrow('Model is required');
    });

    it('throws error for unsupported provider', async () => {
      const config = {
        id: '6',
        userId: 'user1',
        provider: 'invalid-provider',
        model: 'some-model',
        apiKey: 'test-api-key',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as LLMConfig;

      await expect(ProviderFactory.createProvider(config)).rejects.toThrow(
        ProviderConfigurationError
      );
      await expect(ProviderFactory.createProvider(config)).rejects.toThrow('Unknown provider');
    });
  });
});

describe('ProviderWithFallback', () => {
  it('uses primary provider when successful', async () => {
    const mockPrimaryProvider = {
      chat: vi.fn().mockResolvedValue({ content: 'primary response' }),
      stream: vi.fn(),
    };

    const mockFallbackProvider = {
      chat: vi.fn().mockResolvedValue({ content: 'fallback response' }),
      stream: vi.fn(),
    };

    const provider = new ProviderWithFallback(
      mockPrimaryProvider,
      mockFallbackProvider,
      'openai',
      'anthropic'
    );

    const result = await provider.chat([{ role: 'user', content: 'test' }]);

    expect(result.content).toBe('primary response');
    expect(mockPrimaryProvider.chat).toHaveBeenCalled();
    expect(mockFallbackProvider.chat).not.toHaveBeenCalled();
  });

  it('fallback triggers on RateLimitError', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.name = 'RateLimitError';

    const mockPrimaryProvider = {
      chat: vi.fn().mockRejectedValue(rateLimitError),
      stream: vi.fn(),
    };

    const mockFallbackProvider = {
      chat: vi.fn().mockResolvedValue({ content: 'fallback response' }),
      stream: vi.fn(),
    };

    const provider = new ProviderWithFallback(
      mockPrimaryProvider,
      mockFallbackProvider,
      'openai',
      'anthropic'
    );

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await provider.chat([{ role: 'user', content: 'test' }]);

    expect(result.content).toBe('fallback response');
    expect(mockFallbackProvider.chat).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('fallback triggers on ServiceUnavailableError', async () => {
    const serviceError = new Error('Service unavailable');
    serviceError.name = 'ServiceUnavailableError';

    const mockPrimaryProvider = {
      chat: vi.fn().mockRejectedValue(serviceError),
      stream: vi.fn(),
    };

    const mockFallbackProvider = {
      chat: vi.fn().mockResolvedValue({ content: 'fallback response' }),
      stream: vi.fn(),
    };

    const provider = new ProviderWithFallback(
      mockPrimaryProvider,
      mockFallbackProvider,
      'openai',
      'anthropic'
    );

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await provider.chat([{ role: 'user', content: 'test' }]);

    expect(result.content).toBe('fallback response');
    expect(mockFallbackProvider.chat).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('fallback triggers on TimeoutError', async () => {
    const timeoutError = new Error('Timeout');
    timeoutError.name = 'TimeoutError';

    const mockPrimaryProvider = {
      chat: vi.fn().mockRejectedValue(timeoutError),
      stream: vi.fn(),
    };

    const mockFallbackProvider = {
      chat: vi.fn().mockResolvedValue({ content: 'fallback response' }),
      stream: vi.fn(),
    };

    const provider = new ProviderWithFallback(
      mockPrimaryProvider,
      mockFallbackProvider,
      'openai',
      'anthropic'
    );

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await provider.chat([{ role: 'user', content: 'test' }]);

    expect(result.content).toBe('fallback response');
    expect(mockFallbackProvider.chat).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('does not fallback on non-retryable errors', async () => {
    const authError = new Error('Authentication failed');
    authError.name = 'AuthenticationError';

    const mockPrimaryProvider = {
      chat: vi.fn().mockRejectedValue(authError),
      stream: vi.fn(),
    };

    const mockFallbackProvider = {
      chat: vi.fn().mockResolvedValue({ content: 'fallback response' }),
      stream: vi.fn(),
    };

    const provider = new ProviderWithFallback(
      mockPrimaryProvider,
      mockFallbackProvider,
      'openai',
      'anthropic'
    );

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(provider.chat([{ role: 'user', content: 'test' }])).rejects.toThrow(
      'Authentication failed'
    );

    expect(mockFallbackProvider.chat).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('throws error when fallback is not configured', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.name = 'RateLimitError';

    const mockPrimaryProvider = {
      chat: vi.fn().mockRejectedValue(rateLimitError),
      stream: vi.fn(),
    };

    const provider = new ProviderWithFallback(mockPrimaryProvider, undefined, 'openai');

    await expect(provider.chat([{ role: 'user', content: 'test' }])).rejects.toThrow(
      'Rate limit exceeded'
    );
  });

  it('persists fallback mode for subsequent requests', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.name = 'RateLimitError';

    const mockPrimaryProvider = {
      chat: vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({ content: 'primary response' }),
      stream: vi.fn(),
    };

    const mockFallbackProvider = {
      chat: vi.fn().mockResolvedValue({ content: 'fallback response' }),
      stream: vi.fn(),
    };

    const provider = new ProviderWithFallback(
      mockPrimaryProvider,
      mockFallbackProvider,
      'openai',
      'anthropic'
    );

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result1 = await provider.chat([{ role: 'user', content: 'test1' }]);
    expect(result1.content).toBe('fallback response');

    const result2 = await provider.chat([{ role: 'user', content: 'test2' }]);
    expect(result2.content).toBe('fallback response');

    expect(mockPrimaryProvider.chat).toHaveBeenCalledTimes(1);
    expect(mockFallbackProvider.chat).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it('resets fallback mode when resetFallback is called', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.name = 'RateLimitError';

    const mockPrimaryProvider = {
      chat: vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({ content: 'primary response' }),
      stream: vi.fn(),
    };

    const mockFallbackProvider = {
      chat: vi.fn().mockResolvedValue({ content: 'fallback response' }),
      stream: vi.fn(),
    };

    const provider = new ProviderWithFallback(
      mockPrimaryProvider,
      mockFallbackProvider,
      'openai',
      'anthropic'
    );

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result1 = await provider.chat([{ role: 'user', content: 'test1' }]);
    expect(result1.content).toBe('fallback response');

    provider.resetFallback();

    const result2 = await provider.chat([{ role: 'user', content: 'test2' }]);
    expect(result2.content).toBe('primary response');

    expect(mockPrimaryProvider.chat).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it('supports streaming with fallback', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.name = 'RateLimitError';

    async function* primaryStream(): AsyncIterableIterator<string> {
      throw rateLimitError;
      yield '';
    }

    async function* fallbackStream() {
      yield 'Hello';
      yield ' ';
      yield 'from';
      yield ' ';
      yield 'fallback';
    }

    const mockPrimaryProvider = {
      chat: vi.fn(),
      stream: vi.fn().mockReturnValue(primaryStream()),
    };

    const mockFallbackProvider = {
      chat: vi.fn(),
      stream: vi.fn().mockReturnValue(fallbackStream()),
    };

    const provider = new ProviderWithFallback(
      mockPrimaryProvider,
      mockFallbackProvider,
      'openai',
      'anthropic'
    );

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const chunks: string[] = [];
    for await (const chunk of provider.stream([{ role: 'user', content: 'test' }])) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Hello from fallback');
    expect(mockFallbackProvider.stream).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
