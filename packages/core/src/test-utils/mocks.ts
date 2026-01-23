import { vi } from 'vitest';

export function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

export function createMockLLMProvider() {
  return {
    chat: vi.fn().mockResolvedValue({
      content: 'Mock LLM response',
      tokens: { prompt: 10, completion: 20, total: 30 },
    }),
    stream: vi.fn(),
  };
}

export function createMockFileWriter() {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    writeMultiple: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  };
}
