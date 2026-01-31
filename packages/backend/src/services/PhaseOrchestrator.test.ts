import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhaseOrchestrator, PhaseTransitionError } from './PhaseOrchestrator';
import type { GenerationSession, PhaseError } from '@obsidian/core';
import type { PrismaClient } from '@prisma/client';
import { GenerationEventEmitter } from '../websocket/EventEmitter';

function createMockSession(): GenerationSession {
  return {
    id: 'test-session-1',
    userId: 'user-1',
    projectId: 'project-1',
    prompt: 'Create a todo app',
    appType: 'web',
    currentPhase: {
      phase: 'discovery',
      status: 'pending',
      artifacts: {},
      errors: [],
      retryCount: 0,
    },
    history: [],
    config: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function createMockPrisma(): PrismaClient {
  return {
    project: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    specFile: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaClient;
}

function createMockEventEmitter(): GenerationEventEmitter {
  return {
    emitPhaseUpdate: vi.fn(),
  } as unknown as GenerationEventEmitter;
}

describe('PhaseOrchestrator', () => {
  let session: GenerationSession;
  let orchestrator: PhaseOrchestrator;
  let mockPrisma: PrismaClient;
  let mockEventEmitter: GenerationEventEmitter;

  beforeEach(() => {
    session = createMockSession();
    mockPrisma = createMockPrisma();
    mockEventEmitter = createMockEventEmitter();
    orchestrator = new PhaseOrchestrator(session, mockPrisma, mockEventEmitter);
  });

  describe('startPhase', () => {
    it('starts discovery phase from pending status', async () => {
      const context = await orchestrator.startPhase('discovery');

      expect(context.phase).toBe('discovery');
      expect(context.status).toBe('in_progress');
      expect(context.startedAt).toBeDefined();
      expect(context.retryCount).toBe(0);
    });

    it('adds previous phase to history when starting new phase', async () => {
      session.currentPhase.status = 'completed';
      const previousPhase = { ...session.currentPhase };

      await orchestrator.startPhase('planning');

      expect(session.history).toHaveLength(1);
      expect(session.history[0]).toMatchObject({
        phase: previousPhase.phase,
        status: previousPhase.status,
      });
    });

    it('prevents starting planning before discovery is completed', async () => {
      session.currentPhase.status = 'in_progress';

      await expect(orchestrator.startPhase('planning')).rejects.toThrow(PhaseTransitionError);
      await expect(orchestrator.startPhase('planning')).rejects.toThrow(/Stop-the-Line rule/);
    });

    it('prevents skipping phases', async () => {
      session.currentPhase.status = 'completed';

      await expect(orchestrator.startPhase('execution')).rejects.toThrow(PhaseTransitionError);
      await expect(orchestrator.startPhase('execution')).rejects.toThrow(/Invalid phase progression/);
    });

    it('allows restarting failed phase', async () => {
      session.currentPhase.status = 'failed';

      const context = await orchestrator.startPhase('discovery');

      expect(context.phase).toBe('discovery');
      expect(context.status).toBe('in_progress');
    });

    it('persists session state to database', async () => {
      await orchestrator.startPhase('discovery');

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: {
          currentPhase: 'discovery',
          phaseStatus: 'in_progress',
          status: 'in_progress',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('emits PHASE_CHANGED event', async () => {
      await orchestrator.startPhase('discovery');

      expect(mockEventEmitter.emitPhaseUpdate).toHaveBeenCalledWith({
        projectId: 'project-1',
        phase: 'discovery',
        status: 'PHASE_CHANGED',
        data: {
          phase: 'discovery',
          status: 'in_progress',
          sessionId: 'test-session-1',
        },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('completePhase', () => {
    beforeEach(async () => {
      await orchestrator.startPhase('discovery');
    });

    it('completes current phase', async () => {
      const artifacts = { 'architecture.md': 'content' };
      const context = await orchestrator.completePhase(artifacts);

      expect(context.status).toBe('completed');
      expect(context.artifacts).toEqual(artifacts);
      expect(context.completedAt).toBeDefined();
    });

    it('merges artifacts with existing ones', async () => {
      session.currentPhase.artifacts = { 'file1.txt': 'existing' };
      const newArtifacts = { 'file2.txt': 'new' };

      const context = await orchestrator.completePhase(newArtifacts);

      expect(context.artifacts).toEqual({
        'file1.txt': 'existing',
        'file2.txt': 'new',
      });
    });

    it('throws error when phase is not in_progress', async () => {
      session.currentPhase.status = 'pending';

      await expect(orchestrator.completePhase()).rejects.toThrow(PhaseTransitionError);
      await expect(orchestrator.completePhase()).rejects.toThrow(/Invalid status transition/);
    });

    it('persists artifacts to database', async () => {
      const artifacts = { 'architecture.md': 'content', 'plan.md': 'steps' };
      await orchestrator.completePhase(artifacts);

      expect(mockPrisma.specFile.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith({
        where: {
          projectId_filename: {
            projectId: 'project-1',
            filename: 'architecture.md',
          },
        },
        update: { content: 'content' },
        create: {
          projectId: 'project-1',
          filename: 'architecture.md',
          content: 'content',
          phase: 'discovery',
        },
      });
    });

    it('emits SPEC_GENERATED event for spec artifacts', async () => {
      const artifacts = { 'architecture.md': 'content' };
      await orchestrator.completePhase(artifacts);

      const calls = (mockEventEmitter.emitPhaseUpdate as any).mock.calls;
      const specGeneratedCall = calls.find((call: any) => call[0].status === 'SPEC_GENERATED');
      expect(specGeneratedCall).toBeDefined();
    });
  });

  describe('failPhase', () => {
    beforeEach(async () => {
      await orchestrator.startPhase('discovery');
    });

    it('marks phase as failed with error', async () => {
      const error: PhaseError = {
        message: 'LLM request failed',
        code: 'LLM_ERROR',
        timestamp: Date.now(),
      };

      const context = await orchestrator.failPhase(error);

      expect(context.status).toBe('failed');
      expect(context.errors).toContain(error);
      expect(context.completedAt).toBeDefined();
    });

    it('accumulates multiple errors', async () => {
      const error1: PhaseError = {
        message: 'Error 1',
        code: 'ERR1',
        timestamp: Date.now(),
      };
      const error2: PhaseError = {
        message: 'Error 2',
        code: 'ERR2',
        timestamp: Date.now(),
      };

      await orchestrator.failPhase(error1);
      session.currentPhase.status = 'in_progress';
      await orchestrator.failPhase(error2);

      expect(session.currentPhase.errors).toHaveLength(2);
    });

    it('emits PHASE_FAILED event', async () => {
      const error: PhaseError = {
        message: 'Test error',
        code: 'TEST_ERR',
        timestamp: Date.now(),
      };

      await orchestrator.failPhase(error);

      const calls = (mockEventEmitter.emitPhaseUpdate as any).mock.calls;
      const failedCall = calls.find((call: any) => call[0].status === 'PHASE_FAILED');
      expect(failedCall).toBeDefined();
      expect(failedCall[0].data.error).toBe('Test error');
    });
  });

  describe('retryPhase', () => {
    beforeEach(async () => {
      await orchestrator.startPhase('discovery');
      const error: PhaseError = {
        message: 'Test error',
        code: 'TEST_ERR',
        timestamp: Date.now(),
      };
      await orchestrator.failPhase(error);
    });

    it('retries failed phase', async () => {
      const context = await orchestrator.retryPhase();

      expect(context.status).toBe('in_progress');
      expect(context.retryCount).toBe(1);
      expect(context.startedAt).toBeDefined();
      expect(context.completedAt).toBeUndefined();
    });

    it('increments retry count on multiple retries', async () => {
      await orchestrator.retryPhase();
      const error: PhaseError = {
        message: 'Test error',
        code: 'TEST_ERR',
        timestamp: Date.now(),
      };
      await orchestrator.failPhase(error);

      const context = await orchestrator.retryPhase();

      expect(context.retryCount).toBe(2);
    });

    it('throws error when retrying non-failed phase', async () => {
      session.currentPhase.status = 'completed';

      await expect(orchestrator.retryPhase()).rejects.toThrow(PhaseTransitionError);
      await expect(orchestrator.retryPhase()).rejects.toThrow(/Cannot retry phase/);
    });

    it('applies exponential backoff (1s, 2s, 4s)', async () => {
      const startTime = Date.now();
      await orchestrator.retryPhase();
      const firstRetryTime = Date.now() - startTime;

      await orchestrator.failPhase({ message: 'Error', code: 'ERR', timestamp: Date.now() });
      
      const startTime2 = Date.now();
      await orchestrator.retryPhase();
      const secondRetryTime = Date.now() - startTime2;

      expect(firstRetryTime).toBeGreaterThanOrEqual(1000);
      expect(firstRetryTime).toBeLessThan(1500);
      expect(secondRetryTime).toBeGreaterThanOrEqual(2000);
      expect(secondRetryTime).toBeLessThan(2500);
    });

    it('prevents retry after max retries exceeded', async () => {
      session.config.maxRetries = 2;

      await orchestrator.retryPhase();
      await orchestrator.failPhase({ message: 'Error', code: 'ERR', timestamp: Date.now() });
      await orchestrator.retryPhase();
      await orchestrator.failPhase({ message: 'Error', code: 'ERR', timestamp: Date.now() });

      await expect(orchestrator.retryPhase()).rejects.toThrow(PhaseTransitionError);
      await expect(orchestrator.retryPhase()).rejects.toThrow(/Maximum retries/);
    });
  });

  describe('canProgressToNextPhase', () => {
    it('returns false when phase is not completed', () => {
      session.currentPhase.status = 'in_progress';

      expect(orchestrator.canProgressToNextPhase()).toBe(false);
    });

    it('returns true when phase is completed', () => {
      session.currentPhase.status = 'completed';

      expect(orchestrator.canProgressToNextPhase()).toBe(true);
    });

    it('returns false when phase is failed', () => {
      session.currentPhase.status = 'failed';

      expect(orchestrator.canProgressToNextPhase()).toBe(false);
    });

    it('returns false on verification phase (final phase)', () => {
      session.currentPhase = {
        phase: 'verification',
        status: 'completed',
        artifacts: {},
        errors: [],
        retryCount: 0,
      };

      expect(orchestrator.canProgressToNextPhase()).toBe(false);
    });
  });

  describe('getNextPhase', () => {
    it('returns planning after discovery', () => {
      session.currentPhase.status = 'completed';

      expect(orchestrator.getNextPhase()).toBe('planning');
    });

    it('returns execution after planning', () => {
      session.currentPhase = {
        phase: 'planning',
        status: 'completed',
        artifacts: {},
        errors: [],
        retryCount: 0,
      };

      expect(orchestrator.getNextPhase()).toBe('execution');
    });

    it('returns verification after execution', () => {
      session.currentPhase = {
        phase: 'execution',
        status: 'completed',
        artifacts: {},
        errors: [],
        retryCount: 0,
      };

      expect(orchestrator.getNextPhase()).toBe('verification');
    });

    it('returns null after verification', () => {
      session.currentPhase = {
        phase: 'verification',
        status: 'completed',
        artifacts: {},
        errors: [],
        retryCount: 0,
      };

      expect(orchestrator.getNextPhase()).toBe(null);
    });

    it('returns null when current phase not completed', () => {
      session.currentPhase.status = 'in_progress';

      expect(orchestrator.getNextPhase()).toBe(null);
    });
  });

  describe('Stop-the-Line rule', () => {
    it('prevents starting planning when discovery failed', async () => {
      await orchestrator.startPhase('discovery');
      const error: PhaseError = {
        message: 'Discovery failed',
        code: 'DISCOVERY_ERR',
        timestamp: Date.now(),
      };
      await orchestrator.failPhase(error);

      await expect(orchestrator.startPhase('planning')).rejects.toThrow(PhaseTransitionError);
      await expect(orchestrator.startPhase('planning')).rejects.toThrow(/Stop-the-Line rule/);
    });

    it('prevents starting execution when planning failed', async () => {
      await orchestrator.startPhase('discovery');
      await orchestrator.completePhase();
      await orchestrator.startPhase('planning');
      const error: PhaseError = {
        message: 'Planning failed',
        code: 'PLANNING_ERR',
        timestamp: Date.now(),
      };
      await orchestrator.failPhase(error);

      await expect(orchestrator.startPhase('execution')).rejects.toThrow(PhaseTransitionError);
      await expect(orchestrator.startPhase('execution')).rejects.toThrow(/Stop-the-Line rule/);
    });

    it('allows progression after failed phase is retried and completed', async () => {
      await orchestrator.startPhase('discovery');
      const error: PhaseError = {
        message: 'Test error',
        code: 'TEST_ERR',
        timestamp: Date.now(),
      };
      await orchestrator.failPhase(error);

      await orchestrator.retryPhase();
      await orchestrator.completePhase();

      await expect(orchestrator.startPhase('planning')).resolves.not.toThrow();
    });
  });

  describe('full workflow', () => {
    it('completes all phases in order', async () => {
      await orchestrator.startPhase('discovery');
      await orchestrator.completePhase({ 'architecture.md': 'spec' });

      await orchestrator.startPhase('planning');
      await orchestrator.completePhase({ 'plan.md': 'steps' });

      await orchestrator.startPhase('execution');
      await orchestrator.completePhase({ 'src/app.ts': 'code' });

      await orchestrator.startPhase('verification');
      await orchestrator.completePhase({ 'verification.md': 'results' });

      const finalSession = orchestrator.getSession();
      expect(finalSession.currentPhase.phase).toBe('verification');
      expect(finalSession.currentPhase.status).toBe('completed');
      expect(finalSession.history).toHaveLength(4);
    });
  });

  describe('createSession (static factory)', () => {
    it('creates a new session in database', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: 'user-123',
        prompt: 'Build a chat app',
        appType: 'web',
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.prompt).toBe('Build a chat app');
      expect(session.appType).toBe('web');
      expect(session.currentPhase.phase).toBe('discovery');
      expect(session.currentPhase.status).toBe('pending');
      expect(mockPrisma.project.create).toHaveBeenCalled();
    });

    it('creates project with generated ID', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: 'user-123',
        prompt: 'Build a chat app',
        appType: 'web',
      });

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          name: expect.stringContaining('Project-'),
          prompt: 'Build a chat app',
          appType: 'web',
          userId: 'user-123',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath: expect.stringContaining('generated-projects/user-123/'),
        },
      });
    });

    it('initializes session with config', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: 'user-123',
        prompt: 'Build a chat app',
        appType: 'web',
        llmConfigId: 'llm-config-1',
        timeout: 30000,
        maxRetries: 5,
      });

      expect(session.config.llmConfigId).toBe('llm-config-1');
      expect(session.config.timeout).toBe(30000);
      expect(session.config.maxRetries).toBe(5);
    });
  });
});
