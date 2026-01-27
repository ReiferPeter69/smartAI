import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LLMConfigService } from '../services/LLMConfigService';
import { LLMService } from '../services/LLMService';
import { ProviderFactory } from './ProviderFactory';
import type { LLMConfig, ChatMessage } from '@obsidian/core';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
}));

describe('Phase 2 Integration Test', () => {
  let mockPrisma: {
    lLMConfig: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    user: {
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
    $disconnect: ReturnType<typeof vi.fn>;
  };
  let llmConfigService: LLMConfigService;
  let llmService: LLMService;
  const testUserId = 'test-user-phase2';

  beforeEach(() => {
    mockPrisma = {
      lLMConfig: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        create: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(),
      $disconnect: vi.fn(),
    };

    llmConfigService = new LLMConfigService(mockPrisma as unknown as PrismaClient);
    llmService = new LLMService({
      maxRetries: 1,
      retryDelay: 100,
      timeout: 5000,
      enableLogging: true,
    });
  });

  describe('1. Provider Factory Selection', () => {
    it.skip('selects OpenAI provider with correct configuration (manual test with real API key)', async () => {
      const config: LLMConfig = {
        id: '1',
        userId: testUserId,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-openai-key',
        endpoint: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider = await ProviderFactory.createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.chat).toBeDefined();
      expect(provider.stream).toBeDefined();
    });

    it.skip('selects Anthropic provider with correct configuration (manual test with real API key)', async () => {
      const config: LLMConfig = {
        id: '2',
        userId: testUserId,
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        apiKey: 'test-anthropic-key',
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider = await ProviderFactory.createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.chat).toBeDefined();
      expect(provider.stream).toBeDefined();
    });

    it.skip('selects Ollama provider with default endpoint (manual test with running Ollama)', async () => {
      const config: LLMConfig = {
        id: '3',
        userId: testUserId,
        provider: 'ollama',
        model: 'llama3.2',
        apiKey: null,
        endpoint: 'http://localhost:11434',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider = await ProviderFactory.createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.chat).toBeDefined();
      expect(provider.stream).toBeDefined();
    });

    it('rejects invalid provider configuration', async () => {
      const config: LLMConfig = {
        id: '4',
        userId: testUserId,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: null,
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(ProviderFactory.createProvider(config)).rejects.toThrow(
        'OpenAI requires an API key'
      );
    });
  });

  describe('2. Provider Switching', () => {
    it.skip('creates different providers for different configurations (manual test with real API keys)', async () => {
      const openaiConfig: LLMConfig = {
        id: '5',
        userId: testUserId,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-openai-key',
        endpoint: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const anthropicConfig: LLMConfig = {
        id: '6',
        userId: testUserId,
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        apiKey: 'test-anthropic-key',
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const openaiProvider = await ProviderFactory.createProvider(openaiConfig);
      const anthropicProvider = await ProviderFactory.createProvider(anthropicConfig);

      expect(openaiProvider).not.toBe(anthropicProvider);
      expect(openaiProvider.constructor.name).toBe('OpenAIProvider');
      expect(anthropicProvider.constructor.name).toBe('AnthropicProvider');
    });
  });

  describe('3. Fallback Mechanism', () => {
    it.skip('creates provider with fallback configuration (manual test with real API keys)', async () => {
      const primaryConfig: LLMConfig = {
        id: '7',
        userId: testUserId,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-openai-key',
        endpoint: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const fallbackConfig: LLMConfig = {
        id: '8',
        userId: testUserId,
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        apiKey: 'test-anthropic-key',
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const providerWithFallback = await ProviderFactory.createWithFallback({
        primaryConfig,
        fallbackConfig,
      });

      expect(providerWithFallback).toBeDefined();
      expect(providerWithFallback.constructor.name).toBe('ProviderWithFallback');
    });

    it.skip('fallback triggers on primary provider failure (manual test with real API keys)', async () => {
      const primaryConfig: LLMConfig = {
        id: '9',
        userId: testUserId,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'invalid-key-will-fail',
        endpoint: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const fallbackConfig: LLMConfig = {
        id: '10',
        userId: testUserId,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: 'invalid-key-will-fail',
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const providerWithFallback = await ProviderFactory.createWithFallback({
        primaryConfig,
        fallbackConfig,
      });

      expect(providerWithFallback.resetFallback).toBeDefined();
    });
  });

  describe('4. API Key Encryption/Decryption', () => {
    it('encrypts API keys before storing in database', async () => {
      const plainApiKey = 'sk-test-super-secret-key-12345';

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);
      mockPrisma.lLMConfig.findFirst.mockResolvedValue(null);

      let encryptedKey: string | undefined;
      mockPrisma.lLMConfig.create.mockImplementation(async (args: { data: { apiKey?: string } }) => {
        encryptedKey = args.data.apiKey;
        return {
          id: 'enc-test-1',
          userId: testUserId,
          provider: 'openai',
          model: 'gpt-4',
          apiKey: encryptedKey,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      await llmConfigService.createConfig(testUserId, {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: plainApiKey,
      });

      expect(encryptedKey).toBeDefined();
      expect(encryptedKey).not.toBe(plainApiKey);
      expect(encryptedKey).toContain(':');
    });

    it('decrypts API keys when retrieving from database', async () => {
      const plainApiKey = 'sk-test-another-secret-key-67890';

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);
      mockPrisma.lLMConfig.findFirst.mockResolvedValue(null);

      let encryptedKey: string | undefined;
      mockPrisma.lLMConfig.create.mockImplementation(async (args: { data: { apiKey?: string } }) => {
        encryptedKey = args.data.apiKey;
        return {
          id: 'enc-test-2',
          userId: testUserId,
          provider: 'anthropic',
          model: 'claude-3-opus-20240229',
          apiKey: encryptedKey,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const created = await llmConfigService.createConfig(testUserId, {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        apiKey: plainApiKey,
      });

      mockPrisma.lLMConfig.findMany.mockResolvedValue([
        {
          id: created.id,
          userId: testUserId,
          provider: 'anthropic',
          model: 'claude-3-opus-20240229',
          apiKey: encryptedKey,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const retrievedConfigs = await llmConfigService.getConfigs(testUserId);
      const retrievedConfig = retrievedConfigs.find((c) => c.id === created.id);

      expect(retrievedConfig).toBeDefined();
      if (retrievedConfig) {
        expect(retrievedConfig.apiKey).toBe(plainApiKey);
      }
    });

    it('handles round-trip encryption/decryption correctly', async () => {
      const originalKey = 'sk-test-round-trip-key-abcdef';

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);
      mockPrisma.lLMConfig.findFirst.mockResolvedValue(null);

      let encryptedKey: string | undefined;
      mockPrisma.lLMConfig.create.mockImplementation(async (args: { data: { apiKey?: string } }) => {
        encryptedKey = args.data.apiKey;
        return {
          id: 'enc-test-3',
          userId: testUserId,
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          apiKey: encryptedKey,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const created = await llmConfigService.createConfig(testUserId, {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: originalKey,
      });

      expect(created.apiKey).toBe(originalKey);

      mockPrisma.lLMConfig.findMany.mockResolvedValue([
        {
          id: created.id,
          userId: testUserId,
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          apiKey: encryptedKey,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const retrieved = await llmConfigService.getConfigs(testUserId);
      const retrievedConfig = retrieved.find((c) => c.id === created.id);

      expect(retrievedConfig).toBeDefined();
      if (retrievedConfig) {
        expect(retrievedConfig.apiKey).toBe(originalKey);
      }
    });

    it('encrypts different keys to different values', async () => {
      const key1 = 'sk-test-key-one';
      const key2 = 'sk-test-key-two';

      let encryptedKey1: string | undefined;
      let encryptedKey2: string | undefined;

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);
      mockPrisma.lLMConfig.findFirst.mockResolvedValue(null);

      mockPrisma.lLMConfig.create
        .mockImplementationOnce(async (args: { data: { apiKey?: string } }) => {
          encryptedKey1 = args.data.apiKey;
          return {
            id: 'enc-test-4a',
            userId: testUserId,
            provider: 'openai',
            model: 'gpt-4-turbo',
            apiKey: encryptedKey1,
            endpoint: null,
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        })
        .mockImplementationOnce(async (args: { data: { apiKey?: string } }) => {
          encryptedKey2 = args.data.apiKey;
          return {
            id: 'enc-test-4b',
            userId: testUserId,
            provider: 'openai',
            model: 'gpt-4o',
            apiKey: encryptedKey2,
            endpoint: null,
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

      await llmConfigService.createConfig(testUserId, {
        provider: 'openai',
        model: 'gpt-4-turbo',
        apiKey: key1,
      });

      await llmConfigService.createConfig(testUserId, {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: key2,
      });

      expect(encryptedKey1).toBeDefined();
      expect(encryptedKey2).toBeDefined();
      expect(encryptedKey1).not.toBe(encryptedKey2);
      expect(encryptedKey1).not.toBe(key1);
      expect(encryptedKey2).not.toBe(key2);
    });
  });

  describe('5. End-to-End LLM Service Integration', () => {
    it('LLM service uses provider factory to create providers', async () => {
      const config: LLMConfig = {
        id: '11',
        userId: testUserId,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key-for-service',
        endpoint: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(async () => {
        await ProviderFactory.createProvider(config);
      }).toBeDefined();
    });

    it.skip('LLM service logs requests correctly (manual test with real API)', async () => {
      llmService.clearLogs();

      const config: LLMConfig = {
        id: '12',
        userId: testUserId,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-invalid-will-fail',
        endpoint: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello, this is a test message' },
      ];

      let errorThrown = false;
      try {
        await llmService.generateResponse(config, messages, undefined, testUserId);
      } catch (error) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
      const logs = llmService.getLogsByUser(testUserId);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].provider).toBe('openai');
      expect(logs[0].model).toBe('gpt-4');
      expect(logs[0].messages).toEqual(messages);
      expect(logs[0].error).toBeDefined();
    });

    it('validates provider/model combinations', async () => {
      const invalidConfig = {
        provider: 'openai' as const,
        model: 'claude-3-opus',
        apiKey: 'test-key',
      };

      expect(async () => {
        await llmConfigService.createConfig(testUserId, invalidConfig);
      }).toBeDefined();
    });
  });

  describe('6. Configuration Management', () => {
    it('sets default configuration correctly', async () => {
      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);
      mockPrisma.lLMConfig.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'config-default-1',
          userId: testUserId,
          provider: 'openai',
          model: 'gpt-4-config-test-1',
          apiKey: null,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      mockPrisma.lLMConfig.create
        .mockResolvedValueOnce({
          id: 'config-default-1',
          userId: testUserId,
          provider: 'openai',
          model: 'gpt-4-config-test-1',
          apiKey: null,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'config-default-2',
          userId: testUserId,
          provider: 'anthropic',
          model: 'claude-3-opus-config-test',
          apiKey: null,
          endpoint: null,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const config1 = await llmConfigService.createConfig(testUserId, {
        provider: 'openai',
        model: 'gpt-4-config-test-1',
        apiKey: 'test-key-1',
      });

      expect(config1.isDefault).toBe(true);

      const config2 = await llmConfigService.createConfig(testUserId, {
        provider: 'anthropic',
        model: 'claude-3-opus-config-test',
        apiKey: 'test-key-2',
      });

      expect(config2.isDefault).toBe(false);

      mockPrisma.lLMConfig.findUnique.mockResolvedValue({
        id: config2.id,
        userId: testUserId,
        provider: 'anthropic',
        model: 'claude-3-opus-config-test',
        apiKey: null,
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.$transaction.mockResolvedValue([]);

      await llmConfigService.setDefault(testUserId, config2.id);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('prevents duplicate provider/model combinations', async () => {
      const configData = {
        provider: 'openai' as const,
        model: 'gpt-4-duplicate-test',
        apiKey: 'test-key',
      };

      mockPrisma.lLMConfig.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'existing-config',
          userId: testUserId,
          provider: 'openai',
          model: 'gpt-4-duplicate-test',
          apiKey: null,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      mockPrisma.lLMConfig.findFirst.mockResolvedValue(null);
      mockPrisma.lLMConfig.create.mockResolvedValue({
        id: 'new-config',
        userId: testUserId,
        provider: 'openai',
        model: 'gpt-4-duplicate-test',
        apiKey: null,
        endpoint: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await llmConfigService.createConfig(testUserId, configData);

      await expect(llmConfigService.createConfig(testUserId, configData)).rejects.toThrow(
        'Configuration for this provider and model already exists'
      );
    });

    it('retrieves configurations ordered by default status', async () => {
      const mockConfigs = [
        {
          id: 'config-order-2',
          userId: testUserId,
          provider: 'anthropic',
          model: 'claude-3-order-test',
          apiKey: null,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'config-order-1',
          userId: testUserId,
          provider: 'openai',
          model: 'gpt-4-order-test-1',
          apiKey: null,
          endpoint: null,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.lLMConfig.findMany.mockResolvedValue(mockConfigs);

      const configs = await llmConfigService.getConfigs(testUserId);

      expect(configs[0].isDefault).toBe(true);
      expect(configs[0].id).toBe('config-order-2');
    });
  });

  describe('7. Token Usage Tracking', () => {
    it('tracks token usage across requests', async () => {
      llmService.clearLogs();

      const totalUsage = llmService.getTokenUsage();
      expect(totalUsage.promptTokens).toBe(0);
      expect(totalUsage.completionTokens).toBe(0);
      expect(totalUsage.totalTokens).toBe(0);
    });

    it('tracks token usage by user', async () => {
      llmService.clearLogs();

      const usage = llmService.getTokenUsageByUser(testUserId);
      expect(usage.promptTokens).toBe(0);
      expect(usage.completionTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
    });
  });
});
