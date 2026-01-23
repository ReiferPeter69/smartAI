import type { Project, SpecFile } from '../types/project';
import type { LLMConfig } from '../types/llm';
import type { PhaseContext } from '../types/phase';

export interface MockUser {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: 'test-project-id',
    name: 'Test Project',
    prompt: 'Build a test application',
    appType: 'react',
    status: 'generating',
    currentPhase: 'discovery',
    phaseStatus: 'pending',
    filesPath: '/tmp/test-project',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockSpecFile(overrides?: Partial<SpecFile>): SpecFile {
  return {
    id: 'test-spec-file-id',
    projectId: 'test-project-id',
    filename: 'architecture.md',
    content: '# Test Architecture',
    phase: 'discovery',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockLLMConfig(overrides?: Partial<LLMConfig>): LLMConfig {
  return {
    id: 'test-llm-config-id',
    userId: 'test-user-id',
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'encrypted-api-key',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockPhaseContext(overrides?: Partial<PhaseContext>): PhaseContext {
  return {
    phase: 'discovery',
    status: 'pending',
    artifacts: {},
    errors: [],
    retryCount: 0,
    ...overrides,
  };
}
