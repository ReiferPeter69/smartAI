import { describe, it, expect } from 'vitest';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  CreateProjectRequestSchema,
  GetProjectsQuerySchema,
  ServerEventSchema,
  ClientEventSchema,
} from './api.schema';

describe('RegisterRequestSchema', () => {
  it('should validate valid registration', () => {
    const valid = {
      email: 'user@example.com',
      password: 'password123',
      name: 'Test User',
    };
    expect(() => RegisterRequestSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid email', () => {
    const invalid = {
      email: 'not-an-email',
      password: 'password123',
    };
    expect(() => RegisterRequestSchema.parse(invalid)).toThrow();
  });

  it('should reject short password', () => {
    const invalid = {
      email: 'user@example.com',
      password: 'short',
    };
    expect(() => RegisterRequestSchema.parse(invalid)).toThrow();
  });
});

describe('LoginRequestSchema', () => {
  it('should validate valid login', () => {
    const valid = {
      email: 'user@example.com',
      password: 'password123',
    };
    expect(() => LoginRequestSchema.parse(valid)).not.toThrow();
  });
});

describe('CreateProjectRequestSchema', () => {
  it('should validate valid project creation', () => {
    const valid = {
      prompt: 'Build a todo application with React',
      appType: 'react' as const,
    };
    expect(() => CreateProjectRequestSchema.parse(valid)).not.toThrow();
  });

  it('should reject short prompt', () => {
    const invalid = {
      prompt: 'short',
      appType: 'react' as const,
    };
    expect(() => CreateProjectRequestSchema.parse(invalid)).toThrow();
  });
});

describe('GetProjectsQuerySchema', () => {
  it('should use default pagination values', () => {
    const result = GetProjectsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should parse string numbers to integers', () => {
    const result = GetProjectsQuerySchema.parse({ page: '2', limit: '50' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it('should reject limit over 100', () => {
    expect(() => GetProjectsQuerySchema.parse({ limit: 150 })).toThrow();
  });
});

describe('ServerEventSchema', () => {
  it('should validate PHASE_CHANGED event', () => {
    const event = {
      type: 'PHASE_CHANGED' as const,
      phase: 'discovery' as const,
      timestamp: Date.now(),
    };
    expect(() => ServerEventSchema.parse(event)).not.toThrow();
  });

  it('should validate FILE_GENERATED event', () => {
    const event = {
      type: 'FILE_GENERATED' as const,
      path: 'src/App.tsx',
      content: 'export default function App() {}',
    };
    expect(() => ServerEventSchema.parse(event)).not.toThrow();
  });

  it('should validate VERIFICATION_RESULT event', () => {
    const event = {
      type: 'VERIFICATION_RESULT' as const,
      stage: 'typecheck',
      passed: true,
      output: 'No errors found',
    };
    expect(() => ServerEventSchema.parse(event)).not.toThrow();
  });
});

describe('ClientEventSchema', () => {
  it('should validate CLARIFICATION_RESPONSE event', () => {
    const event = {
      type: 'CLARIFICATION_RESPONSE' as const,
      answer: 'Yes, include authentication',
    };
    expect(() => ClientEventSchema.parse(event)).not.toThrow();
  });

  it('should validate APPROVE_SPEC event', () => {
    const event = {
      type: 'APPROVE_SPEC' as const,
    };
    expect(() => ClientEventSchema.parse(event)).not.toThrow();
  });
});
