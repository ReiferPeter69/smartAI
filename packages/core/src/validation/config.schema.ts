import { z } from 'zod';

export const LLMProviderSchema = z.enum(['openai', 'anthropic', 'ollama']);

export const OpenAIModelSchema = z.enum([
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4-turbo-preview',
  'gpt-3.5-turbo',
]);

export const AnthropicModelSchema = z.enum([
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
]);

export const OllamaModelSchema = z.string();

export const LLMConfigSchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: LLMProviderSchema,
  model: z.string(),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  isDefault: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const LLMConfigCreateSchema = z.object({
  provider: LLMProviderSchema,
  model: z.string(),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
}).refine((data) => {
  if (data.provider === 'ollama' && !data.endpoint) {
    return false;
  }
  if ((data.provider === 'openai' || data.provider === 'anthropic') && !data.apiKey) {
    return false;
  }
  return true;
}, {
  message: 'Ollama requires endpoint, OpenAI and Anthropic require apiKey',
});

export const LLMConfigUpdateSchema = z.object({
  model: z.string().optional(),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  isDefault: z.boolean().optional(),
});

export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type OpenAIModel = z.infer<typeof OpenAIModelSchema>;
export type AnthropicModel = z.infer<typeof AnthropicModelSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type LLMConfigCreate = z.infer<typeof LLMConfigCreateSchema>;
export type LLMConfigUpdate = z.infer<typeof LLMConfigUpdateSchema>;
