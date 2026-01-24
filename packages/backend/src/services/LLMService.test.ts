import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMService, LLMServiceError } from './LLMService';
import type { LLMConfig, ChatResponse, LLMProvider } from '@obsidian/core';
import * as ProviderFactoryModule from '../llm/ProviderFactory';

vi.mock('../llm/ProviderFactory');

describe('LLMService', () => {
  let llmService: LLMService;
  let mockProvider: LLMProvider;

  beforeEach(() => {
    llmService = new LLMService({ enableLogging: true });
    mockProvider = {
      chat: vi.fn(),
      stream: vi.fn(),
    };

    vi.spyOn(ProviderFactoryModule.ProviderFactory, 'createProvider').mockResolvedValue(
      mockProvider
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateResponse', () => {
    it('generates response using provider', async () => {
      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse: ChatResponse = {
        content: 'Hello, world!',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      mockProvider.chat.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const response = await llmService.generateResponse(llmConfig, messages, undefined, 'user1');

      expect(response).toEqual(mockResponse);
      expect(mockProvider.chat).toHaveBeenCalledWith(messages, undefined);
    });

    it('logs request and response', async () => {
      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse: ChatResponse = {
        content: 'Response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      mockProvider.chat.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Test' }];
      await llmService.generateResponse(llmConfig, messages, undefined, 'user1');

      const logs = llmService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user1');
      expect(logs[0].provider).toBe('openai');
      expect(logs[0].model).toBe('gpt-4');
      expect(logs[0].response).toEqual(mockResponse);
    });

    it('logs errors when request fails', async () => {
      const service = new LLMService({ maxRetries: 0, retryDelay: 10, enableLogging: true });
      vi.spyOn(ProviderFactoryModule.ProviderFactory, 'createProvider').mockResolvedValue(
        mockProvider
      );

      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const error = new Error('API failed');
      mockProvider.chat.mockRejectedValue(error);

      const messages = [{ role: 'user' as const, content: 'Test' }];

      await expect(service.generateResponse(llmConfig, messages, undefined, 'user1')).rejects.toThrow(
        LLMServiceError
      );

      const logs = service.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].error).toBe('API failed');
    });

    it('retries on failure', async () => {
      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse: ChatResponse = {
        content: 'Success',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      mockProvider.chat
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockResponse);

      const service = new LLMService({ maxRetries: 3, retryDelay: 10 });
      vi.spyOn(ProviderFactoryModule.ProviderFactory, 'createProvider').mockResolvedValue(
        mockProvider
      );

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const response = await service.generateResponse(llmConfig, messages);

      expect(response).toEqual(mockResponse);
      expect(mockProvider.chat).toHaveBeenCalledTimes(2);
    });

    it('throws error after max retries', async () => {
      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProvider.chat.mockRejectedValue(new Error('Persistent failure'));

      const service = new LLMService({ maxRetries: 2, retryDelay: 10 });
      vi.spyOn(ProviderFactoryModule.ProviderFactory, 'createProvider').mockResolvedValue(
        mockProvider
      );

      const messages = [{ role: 'user' as const, content: 'Test' }];

      await expect(service.generateResponse(llmConfig, messages)).rejects.toThrow(LLMServiceError);
      expect(mockProvider.chat).toHaveBeenCalledTimes(3);
    });

    it('respects timeout', async () => {
      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProvider.chat.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  content: 'Late response',
                  usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
                }),
              200
            )
          )
      );

      const service = new LLMService({ timeout: 50, maxRetries: 0 });
      vi.spyOn(ProviderFactoryModule.ProviderFactory, 'createProvider').mockResolvedValue(
        mockProvider
      );

      const messages = [{ role: 'user' as const, content: 'Test' }];

      await expect(service.generateResponse(llmConfig, messages)).rejects.toThrow(/timed out/);
    });
  });

  describe('generateResponseWithFallback', () => {
    it('generates response using fallback provider', async () => {
      const primaryConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'key1',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const fallbackConfig: LLMConfig = {
        id: '2',
        userId: 'user1',
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: 'key2',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse: ChatResponse = {
        content: 'Response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      const mockFallbackProvider = {
        chat: vi.fn().mockResolvedValue(mockResponse),
        stream: vi.fn(),
      };

      vi.spyOn(ProviderFactoryModule.ProviderFactory, 'createWithFallback').mockResolvedValue(
        mockFallbackProvider
      );

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const response = await llmService.generateResponseWithFallback(
        primaryConfig,
        fallbackConfig,
        messages,
        undefined,
        'user1'
      );

      expect(response).toEqual(mockResponse);
      expect(mockFallbackProvider.chat).toHaveBeenCalledWith(messages, undefined);
    });

    it('logs fallback requests correctly', async () => {
      const primaryConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'key1',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const fallbackConfig: LLMConfig = {
        id: '2',
        userId: 'user1',
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: 'key2',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse: ChatResponse = {
        content: 'Response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      const mockFallbackProvider = {
        chat: vi.fn().mockResolvedValue(mockResponse),
        stream: vi.fn(),
      };

      vi.spyOn(ProviderFactoryModule.ProviderFactory, 'createWithFallback').mockResolvedValue(
        mockFallbackProvider
      );

      const messages = [{ role: 'user' as const, content: 'Test' }];
      await llmService.generateResponseWithFallback(
        primaryConfig,
        fallbackConfig,
        messages,
        undefined,
        'user1'
      );

      const logs = llmService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].provider).toContain('openai');
      expect(logs[0].provider).toContain('anthropic');
    });
  });

  describe('token tracking', () => {
    it('tracks total token usage', async () => {
      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse1: ChatResponse = {
        content: 'Response 1',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      const mockResponse2: ChatResponse = {
        content: 'Response 2',
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      };

      mockProvider.chat
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const messages = [{ role: 'user' as const, content: 'Test' }];
      await llmService.generateResponse(llmConfig, messages);
      await llmService.generateResponse(llmConfig, messages);

      const usage = llmService.getTokenUsage();
      expect(usage.promptTokens).toBe(30);
      expect(usage.completionTokens).toBe(15);
      expect(usage.totalTokens).toBe(45);
    });

    it('tracks token usage by user', async () => {
      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse: ChatResponse = {
        content: 'Response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      mockProvider.chat.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Test' }];
      await llmService.generateResponse(llmConfig, messages, undefined, 'user1');
      await llmService.generateResponse(llmConfig, messages, undefined, 'user2');

      const user1Usage = llmService.getTokenUsageByUser('user1');
      const user2Usage = llmService.getTokenUsageByUser('user2');

      expect(user1Usage.totalTokens).toBe(15);
      expect(user2Usage.totalTokens).toBe(15);
    });
  });

  describe('log management', () => {
    it('retrieves logs by user', async () => {
      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse: ChatResponse = {
        content: 'Response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      mockProvider.chat.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Test' }];
      await llmService.generateResponse(llmConfig, messages, undefined, 'user1');
      await llmService.generateResponse(llmConfig, messages, undefined, 'user2');

      const user1Logs = llmService.getLogsByUser('user1');
      expect(user1Logs).toHaveLength(1);
      expect(user1Logs[0].userId).toBe('user1');
    });

    it('clears logs', async () => {
      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse: ChatResponse = {
        content: 'Response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      mockProvider.chat.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Test' }];
      await llmService.generateResponse(llmConfig, messages);

      expect(llmService.getLogs()).toHaveLength(1);

      llmService.clearLogs();

      expect(llmService.getLogs()).toHaveLength(0);
    });

    it('does not log when logging disabled', async () => {
      const service = new LLMService({ enableLogging: false });
      vi.spyOn(ProviderFactoryModule.ProviderFactory, 'createProvider').mockResolvedValue(
        mockProvider
      );

      const llmConfig: LLMConfig = {
        id: '1',
        userId: 'user1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse: ChatResponse = {
        content: 'Response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      mockProvider.chat.mockResolvedValue(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Test' }];
      await service.generateResponse(llmConfig, messages);

      expect(service.getLogs()).toHaveLength(0);
    });
  });
});
