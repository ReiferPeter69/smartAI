import { describe, it, expect } from 'vitest';
import { LLMConfigCreateSchema, LLMProviderSchema } from './config.schema';

describe('LLMProviderSchema', () => {
  it('should accept valid providers', () => {
    expect(() => LLMProviderSchema.parse('openai')).not.toThrow();
    expect(() => LLMProviderSchema.parse('anthropic')).not.toThrow();
    expect(() => LLMProviderSchema.parse('ollama')).not.toThrow();
  });

  it('should reject invalid provider', () => {
    expect(() => LLMProviderSchema.parse('invalid')).toThrow();
  });
});

describe('LLMConfigCreateSchema', () => {
  it('should validate OpenAI config with API key', () => {
    const valid = {
      provider: 'openai' as const,
      model: 'gpt-4',
      apiKey: 'sk-1234567890',
    };
    expect(() => LLMConfigCreateSchema.parse(valid)).not.toThrow();
  });

  it('should validate Anthropic config with API key', () => {
    const valid = {
      provider: 'anthropic' as const,
      model: 'claude-3-opus-20240229',
      apiKey: 'sk-ant-1234567890',
    };
    expect(() => LLMConfigCreateSchema.parse(valid)).not.toThrow();
  });

  it('should validate Ollama config with endpoint', () => {
    const valid = {
      provider: 'ollama' as const,
      model: 'llama2',
      endpoint: 'http://localhost:11434',
    };
    expect(() => LLMConfigCreateSchema.parse(valid)).not.toThrow();
  });

  it('should reject OpenAI config without API key', () => {
    const invalid = {
      provider: 'openai' as const,
      model: 'gpt-4',
    };
    expect(() => LLMConfigCreateSchema.parse(invalid)).toThrow();
  });

  it('should reject Ollama config without endpoint', () => {
    const invalid = {
      provider: 'ollama' as const,
      model: 'llama2',
    };
    expect(() => LLMConfigCreateSchema.parse(invalid)).toThrow();
  });

  it('should reject invalid endpoint URL', () => {
    const invalid = {
      provider: 'ollama' as const,
      model: 'llama2',
      endpoint: 'not-a-url',
    };
    expect(() => LLMConfigCreateSchema.parse(invalid)).toThrow();
  });
});
