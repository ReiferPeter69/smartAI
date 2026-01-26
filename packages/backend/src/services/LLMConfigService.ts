import { PrismaClient, LLMConfig } from '@prisma/client';
import crypto from 'crypto';
import type { LLMConfigCreate } from '@obsidian/core';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export class LLMConfigService {
  constructor(private prisma: PrismaClient) {}

  async getConfigs(userId: string): Promise<LLMConfig[]> {
    const configs = await this.prisma.lLMConfig.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return configs.map((config) => ({
      ...config,
      apiKey: config.apiKey ? this.decrypt(config.apiKey) : null,
    }));
  }

  async createConfig(userId: string, data: LLMConfigCreate): Promise<LLMConfig> {
    const existingConfig = await this.prisma.lLMConfig.findUnique({
      where: {
        userId_provider_model: {
          userId,
          provider: data.provider,
          model: data.model,
        },
      },
    });

    if (existingConfig) {
      throw new Error('Configuration for this provider and model already exists');
    }

    const hasDefaultConfig = await this.prisma.lLMConfig.findFirst({
      where: { userId, isDefault: true },
    });

    const config = await this.prisma.lLMConfig.create({
      data: {
        userId,
        provider: data.provider,
        model: data.model,
        apiKey: data.apiKey ? this.encrypt(data.apiKey) : undefined,
        endpoint: data.endpoint,
        isDefault: !hasDefaultConfig,
      },
    });

    return {
      ...config,
      apiKey: config.apiKey ? this.decrypt(config.apiKey) : null,
    };
  }

  async setDefault(userId: string, configId: string): Promise<void> {
    const config = await this.prisma.lLMConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error('Configuration not found');
    }

    if (config.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.prisma.$transaction([
      this.prisma.lLMConfig.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.lLMConfig.update({
        where: { id: configId },
        data: { isDefault: true },
      }),
    ]);
  }

  async deleteConfig(userId: string, configId: string): Promise<void> {
    const config = await this.prisma.lLMConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error('Configuration not found');
    }

    if (config.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.prisma.lLMConfig.delete({
      where: { id: configId },
    });
  }

  private encrypt(text: string): string {
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
