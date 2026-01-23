import { describe, it, expect } from 'vitest';
import {
  PhaseSchema,
  PhaseStatusSchema,
  SpecFileCreateSchema,
  PlanStepSchema,
} from './spec.schema';

describe('PhaseSchema', () => {
  it('should accept valid phases', () => {
    expect(() => PhaseSchema.parse('discovery')).not.toThrow();
    expect(() => PhaseSchema.parse('planning')).not.toThrow();
    expect(() => PhaseSchema.parse('execution')).not.toThrow();
    expect(() => PhaseSchema.parse('verification')).not.toThrow();
  });

  it('should reject invalid phase', () => {
    expect(() => PhaseSchema.parse('invalid')).toThrow();
  });
});

describe('PhaseStatusSchema', () => {
  it('should accept valid statuses', () => {
    expect(() => PhaseStatusSchema.parse('pending')).not.toThrow();
    expect(() => PhaseStatusSchema.parse('in_progress')).not.toThrow();
    expect(() => PhaseStatusSchema.parse('completed')).not.toThrow();
    expect(() => PhaseStatusSchema.parse('failed')).not.toThrow();
  });
});

describe('SpecFileCreateSchema', () => {
  it('should validate valid spec file', () => {
    const valid = {
      projectId: 'proj-123',
      filename: 'architecture.md',
      content: '# Architecture\n\nDetails here...',
      phase: 'discovery' as const,
    };
    expect(() => SpecFileCreateSchema.parse(valid)).not.toThrow();
  });

  it('should reject non-.md/.txt filename', () => {
    const invalid = {
      projectId: 'proj-123',
      filename: 'spec.json',
      content: '{}',
      phase: 'discovery' as const,
    };
    expect(() => SpecFileCreateSchema.parse(invalid)).toThrow();
  });

  it('should accept .txt files', () => {
    const valid = {
      projectId: 'proj-123',
      filename: 'notes.txt',
      content: 'Some notes',
      phase: 'planning' as const,
    };
    expect(() => SpecFileCreateSchema.parse(valid)).not.toThrow();
  });
});

describe('PlanStepSchema', () => {
  it('should validate valid plan step', () => {
    const valid = {
      id: 'step-1',
      description: 'Create user model',
      dependencies: [],
      verificationStrategy: 'Run unit tests',
    };
    expect(() => PlanStepSchema.parse(valid)).not.toThrow();
  });

  it('should accept optional risks and mitigations', () => {
    const valid = {
      id: 'step-2',
      description: 'Implement authentication',
      dependencies: ['step-1'],
      verificationStrategy: 'Run integration tests',
      risks: ['Security vulnerability'],
      mitigations: ['Use bcrypt for hashing'],
    };
    expect(() => PlanStepSchema.parse(valid)).not.toThrow();
  });
});
