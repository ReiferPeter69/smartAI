import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LLMConfigService } from './LLMConfigService';
import type { LLMConfigCreate } from '@obsidian/core';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
}));

describe('LLMConfigService', () => {
  let service: LLMConfigService;
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
    $transaction: ReturnType<typeof vi.fn>;
  };

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
      $transaction: vi.fn(),
    };
    service = new LLMConfigService(mockPrisma as unknown as PrismaClient);
  });

  describe('getConfigs', () => {
    it('should return all configs for a user with decrypted API keys', async () => {
      const userId = 'user-123';
      const mockConfigs = [
        {
          id: 'config-1',
          userId,
          provider: 'openai',
          model: 'gpt-4',
          apiKey: null,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.lLMConfig.findMany.mockResolvedValue(mockConfigs);

      const result = await service.getConfigs(userId);

      expect(mockPrisma.lLMConfig.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      expect(result).toEqual(mockConfigs);
    });
  });

  describe('createConfig', () => {
    it('should create a new config with encrypted API key', async () => {
      const userId = 'user-123';
      const createData: LLMConfigCreate = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
      };

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);
      mockPrisma.lLMConfig.findFirst.mockResolvedValue(null);

      let encryptedApiKey: string | null = null;
      mockPrisma.lLMConfig.create.mockImplementation(async (args: { data: { apiKey?: string | null } }) => {
        encryptedApiKey = args.data.apiKey || null;
        return {
          id: 'config-1',
          userId,
          provider: createData.provider,
          model: createData.model,
          apiKey: encryptedApiKey,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const result = await service.createConfig(userId, createData);

      expect(mockPrisma.lLMConfig.findUnique).toHaveBeenCalledWith({
        where: {
          userId_provider_model: {
            userId,
            provider: createData.provider,
            model: createData.model,
          },
        },
      });

      expect(mockPrisma.lLMConfig.create).toHaveBeenCalled();
      expect(encryptedApiKey).toBeDefined();
      expect(encryptedApiKey).not.toBe('sk-test-key');
      expect(result.id).toBe('config-1');
      expect(result.apiKey).toBe('sk-test-key');
    });

    it('should throw error if config already exists', async () => {
      const userId = 'user-123';
      const createData: LLMConfigCreate = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
      };

      const existingConfig = {
        id: 'existing-config',
        userId,
        provider: createData.provider,
        model: createData.model,
        apiKey: 'encrypted-key',
        endpoint: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(existingConfig);

      await expect(service.createConfig(userId, createData)).rejects.toThrow(
        'Configuration for this provider and model already exists'
      );
    });

    it('should set isDefault to false when another default exists', async () => {
      const userId = 'user-123';
      const createData: LLMConfigCreate = {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        apiKey: 'sk-ant-key',
      };

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);
      mockPrisma.lLMConfig.findFirst.mockResolvedValue({ id: 'default-config', isDefault: true });

      mockPrisma.lLMConfig.create.mockImplementation(async (args: { data: { apiKey?: string | null } }) => {
        return {
          id: 'config-2',
          userId,
          provider: createData.provider,
          model: createData.model,
          apiKey: args.data.apiKey || null,
          endpoint: null,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const result = await service.createConfig(userId, createData);

      expect(result.isDefault).toBe(false);
    });
  });

  describe('setDefault', () => {
    it('should set config as default and unset others', async () => {
      const userId = 'user-123';
      const configId = 'config-1';

      const mockConfig = {
        id: configId,
        userId,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: null,
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.$transaction.mockImplementation(async (operations: unknown[]) => {
        return operations;
      });

      await service.setDefault(userId, configId);

      expect(mockPrisma.lLMConfig.findUnique).toHaveBeenCalledWith({
        where: { id: configId },
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if config not found', async () => {
      const userId = 'user-123';
      const configId = 'non-existent';

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);

      await expect(service.setDefault(userId, configId)).rejects.toThrow('Configuration not found');
    });

    it('should throw error if user is unauthorized', async () => {
      const userId = 'user-123';
      const configId = 'config-1';

      const mockConfig = {
        id: configId,
        userId: 'other-user',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: null,
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(mockConfig);

      await expect(service.setDefault(userId, configId)).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteConfig', () => {
    it('should delete config if user is authorized', async () => {
      const userId = 'user-123';
      const configId = 'config-1';

      const mockConfig = {
        id: configId,
        userId,
        provider: 'openai',
        model: 'gpt-4',
        apiKey: null,
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.lLMConfig.delete.mockResolvedValue(mockConfig);

      await service.deleteConfig(userId, configId);

      expect(mockPrisma.lLMConfig.delete).toHaveBeenCalledWith({
        where: { id: configId },
      });
    });

    it('should throw error if config not found', async () => {
      const userId = 'user-123';
      const configId = 'non-existent';

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);

      await expect(service.deleteConfig(userId, configId)).rejects.toThrow('Configuration not found');
    });

    it('should throw error if user is unauthorized', async () => {
      const userId = 'user-123';
      const configId = 'config-1';

      const mockConfig = {
        id: configId,
        userId: 'other-user',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: null,
        endpoint: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(mockConfig);

      await expect(service.deleteConfig(userId, configId)).rejects.toThrow('Unauthorized');
    });
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt API keys correctly', async () => {
      const userId = 'user-123';
      const originalApiKey = 'sk-test-1234567890abcdefghijklmnopqrstuvwxyz';
      const createData: LLMConfigCreate = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: originalApiKey,
      };

      mockPrisma.lLMConfig.findUnique.mockResolvedValue(null);
      mockPrisma.lLMConfig.findFirst.mockResolvedValue(null);

      let encryptedApiKey: string | undefined;
      mockPrisma.lLMConfig.create.mockImplementation(async (args: { data: { apiKey?: string } }) => {
        encryptedApiKey = args.data.apiKey;
        return {
          id: 'config-1',
          userId,
          provider: createData.provider,
          model: createData.model,
          apiKey: encryptedApiKey,
          endpoint: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const result = await service.createConfig(userId, createData);

      expect(encryptedApiKey).toBeDefined();
      expect(encryptedApiKey).not.toBe(originalApiKey);
      expect(result.apiKey).toBe(originalApiKey);
    });
  });
});
