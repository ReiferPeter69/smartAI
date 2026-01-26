import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService } from './LLMService';
import { ProviderFactory } from '../llm/ProviderFactory';
import { LLMError, LLMTimeoutError, LLMRateLimitError } from '../llm/types';
import type { LLMProvider, ChatMessage, ChatResponse, LLMConfig } from '../llm/types';

const createMockProvider = (): LLMProvider => ({
  chat: vi.fn(),
  stream: vi.fn(),
});

const createMockConfig = (): LLMConfig => ({
  id: 'test-config',
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-key',
  isDefault: true,
});

const createMockResponse = (): ChatResponse => ({
  content: 'Test response',
  usage: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
  },
  model: 'gpt-4',
  finishReason: 'stop',
});

describe('LLMService', () => {
  let mockProvider: LLMProvider;
  let config: LLMConfig;

  beforeEach(() => {
    mockProvider = createMockProvider();
    config = createMockConfig();
    ProviderFactory.clear();
    ProviderFactory.registerProvider(config.id, mockProvider);
    LLMService.clearLogs();
    LLMService.resetTokenUsage();
  });

  describe('generateResponse', () => {
    it('should successfully generate response', async () => {
      const mockResponse = createMockResponse();
      vi.mocked(mockProvider.chat).mockResolvedValue(mockResponse);

      const service = new LLMService(config);
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const response = await service.generateResponse(messages);

      expect(response).toEqual(mockResponse);
      expect(mockProvider.chat).toHaveBeenCalledWith(messages, { model: 'gpt-4' });
    });

    it('should log request and response', async () => {
      const mockResponse = createMockResponse();
      vi.mocked(mockProvider.chat).mockResolvedValue(mockResponse);

      const service = new LLMService(config);
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      await service.generateResponse(messages);

      const logs = LLMService.getRequestLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].provider).toBe('openai');
      expect(logs[0].model).toBe('gpt-4');
      expect(logs[0].response).toEqual(mockResponse);
    });

    it('should track token usage', async () => {
      const mockResponse = createMockResponse();
      vi.mocked(mockProvider.chat).mockResolvedValue(mockResponse);

      const service = new LLMService(config);
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      await service.generateResponse(messages);

      const usage = LLMService.getTokenUsage();
      expect(usage.total).toBe(30);
      expect(usage.byProvider['openai:gpt-4']).toBe(30);
    });

    it('should handle timeout', async () => {
      vi.mocked(mockProvider.chat).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockResponse()), 200))
      );

      const service = new LLMService(config);
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(
        service.generateResponse(messages, { timeout: 100 })
      ).rejects.toThrow(LLMTimeoutError);
    });

    it('should retry on retryable error', async () => {
      const mockResponse = createMockResponse();
      vi.mocked(mockProvider.chat)
        .mockRejectedValueOnce(new LLMRateLimitError('openai'))
        .mockResolvedValueOnce(mockResponse);

      const service = new LLMService(config, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const response = await service.generateResponse(messages);

      expect(response).toEqual(mockResponse);
      expect(mockProvider.chat).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      const nonRetryableError = new LLMError(
        'Invalid API key',
        'openai',
        'INVALID_KEY',
        false
      );
      vi.mocked(mockProvider.chat).mockRejectedValue(nonRetryableError);

      const service = new LLMService(config);
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(
        service.generateResponse(messages)
      ).rejects.toThrow('Invalid API key');

      expect(mockProvider.chat).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const retryableError = new LLMRateLimitError('openai');
      vi.mocked(mockProvider.chat).mockRejectedValue(retryableError);

      const service = new LLMService(config, {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(
        service.generateResponse(messages)
      ).rejects.toThrow(LLMRateLimitError);

      expect(mockProvider.chat).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const mockResponse = createMockResponse();
      const retryableError = new LLMRateLimitError('openai');
      
      vi.mocked(mockProvider.chat)
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(mockResponse);

      const service = new LLMService(config, {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      });

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const startTime = Date.now();
      await service.generateResponse(messages);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(100);
      expect(mockProvider.chat).toHaveBeenCalledTimes(3);
    });

    it('should pass custom options to provider', async () => {
      const mockResponse = createMockResponse();
      vi.mocked(mockProvider.chat).mockResolvedValue(mockResponse);

      const service = new LLMService(config);
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];
      const options = {
        temperature: 0.7,
        maxTokens: 1000,
      };

      await service.generateResponse(messages, options);

      expect(mockProvider.chat).toHaveBeenCalledWith(messages, {
        ...options,
        model: 'gpt-4',
      });
    });

    it('should log errors', async () => {
      const error = new Error('Test error');
      vi.mocked(mockProvider.chat).mockRejectedValue(error);

      const service = new LLMService(config, {
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(
        service.generateResponse(messages)
      ).rejects.toThrow('Test error');

      const logs = LLMService.getRequestLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].error).toBe('Test error');
    });
  });

  describe('static methods', () => {
    it('should clear logs', async () => {
      const mockResponse = createMockResponse();
      vi.mocked(mockProvider.chat).mockResolvedValue(mockResponse);

      const service = new LLMService(config);
      await service.generateResponse([{ role: 'user', content: 'Hello' }]);

      expect(LLMService.getRequestLogs()).toHaveLength(1);

      LLMService.clearLogs();
      expect(LLMService.getRequestLogs()).toHaveLength(0);
    });

    it('should reset token usage', async () => {
      const mockResponse = createMockResponse();
      vi.mocked(mockProvider.chat).mockResolvedValue(mockResponse);

      const service = new LLMService(config);
      await service.generateResponse([{ role: 'user', content: 'Hello' }]);

      expect(LLMService.getTokenUsage().total).toBe(30);

      LLMService.resetTokenUsage();
      expect(LLMService.getTokenUsage().total).toBe(0);
    });
  });
});
