import { describe, it, expect } from 'vitest';
import { PromptSchema, ClarificationResponseSchema } from './prompt.schema';

describe('PromptSchema', () => {
  it('should validate valid prompt', () => {
    const valid = {
      content: 'Build a todo app with authentication',
      appType: 'react' as const,
    };
    expect(() => PromptSchema.parse(valid)).not.toThrow();
  });

  it('should reject prompt that is too short', () => {
    const invalid = {
      content: 'short',
      appType: 'react' as const,
    };
    expect(() => PromptSchema.parse(invalid)).toThrow();
  });

  it('should reject invalid app type', () => {
    const invalid = {
      content: 'Build a todo app with authentication',
      appType: 'invalid',
    };
    expect(() => PromptSchema.parse(invalid)).toThrow();
  });

  it('should accept optional llmConfigId', () => {
    const valid = {
      content: 'Build a todo app with authentication',
      appType: 'nextjs' as const,
      llmConfigId: 'config-123',
    };
    expect(() => PromptSchema.parse(valid)).not.toThrow();
  });
});

describe('ClarificationResponseSchema', () => {
  it('should validate valid clarification response', () => {
    const valid = {
      answer: 'Yes, include user authentication',
    };
    expect(() => ClarificationResponseSchema.parse(valid)).not.toThrow();
  });

  it('should reject empty answer', () => {
    const invalid = {
      answer: '',
    };
    expect(() => ClarificationResponseSchema.parse(invalid)).toThrow();
  });
});
