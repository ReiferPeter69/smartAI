import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseOrchestrator, PhaseTransitionError } from './PhaseOrchestrator';
import type { GenerationSession, PhaseError } from '@obsidian/core';

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

describe('PhaseOrchestrator', () => {
  let session: GenerationSession;
  let orchestrator: PhaseOrchestrator;

  beforeEach(() => {
    session = createMockSession();
    orchestrator = new PhaseOrchestrator(session);
  });

  describe('startPhase', () => {
    it('starts discovery phase from pending status', () => {
      const context = orchestrator.startPhase('discovery');

      expect(context.phase).toBe('discovery');
      expect(context.status).toBe('in_progress');
      expect(context.startedAt).toBeDefined();
      expect(context.retryCount).toBe(0);
    });

    it('adds previous phase to history when starting new phase', () => {
      session.currentPhase.status = 'completed';
      const previousPhase = { ...session.currentPhase };

      orchestrator.startPhase('planning');

      expect(session.history).toHaveLength(1);
      expect(session.history[0]).toMatchObject({
        phase: previousPhase.phase,
        status: previousPhase.status,
      });
    });

    it('prevents starting planning before discovery is completed', () => {
      session.currentPhase.status = 'in_progress';

      expect(() => orchestrator.startPhase('planning')).toThrow(PhaseTransitionError);
      expect(() => orchestrator.startPhase('planning')).toThrow(/Stop-the-Line rule/);
    });

    it('prevents skipping phases', () => {
      session.currentPhase.status = 'completed';

      expect(() => orchestrator.startPhase('execution')).toThrow(PhaseTransitionError);
      expect(() => orchestrator.startPhase('execution')).toThrow(/Invalid phase progression/);
    });

    it('allows restarting failed phase', () => {
      session.currentPhase.status = 'failed';

      const context = orchestrator.startPhase('discovery');

      expect(context.phase).toBe('discovery');
      expect(context.status).toBe('in_progress');
    });
  });

  describe('completePhase', () => {
    beforeEach(() => {
      orchestrator.startPhase('discovery');
    });

    it('completes current phase', () => {
      const artifacts = { 'architecture.md': 'content' };
      const context = orchestrator.completePhase(artifacts);

      expect(context.status).toBe('completed');
      expect(context.artifacts).toEqual(artifacts);
      expect(context.completedAt).toBeDefined();
    });

    it('merges artifacts with existing ones', () => {
      session.currentPhase.artifacts = { 'file1.txt': 'existing' };
      const newArtifacts = { 'file2.txt': 'new' };

      const context = orchestrator.completePhase(newArtifacts);

      expect(context.artifacts).toEqual({
        'file1.txt': 'existing',
        'file2.txt': 'new',
      });
    });

    it('throws error when phase is not in_progress', () => {
      session.currentPhase.status = 'pending';

      expect(() => orchestrator.completePhase()).toThrow(PhaseTransitionError);
      expect(() => orchestrator.completePhase()).toThrow(/Invalid status transition/);
    });
  });

  describe('failPhase', () => {
    beforeEach(() => {
      orchestrator.startPhase('discovery');
    });

    it('marks phase as failed with error', () => {
      const error: PhaseError = {
        message: 'LLM request failed',
        code: 'LLM_ERROR',
        timestamp: Date.now(),
      };

      const context = orchestrator.failPhase(error);

      expect(context.status).toBe('failed');
      expect(context.errors).toContain(error);
      expect(context.completedAt).toBeDefined();
    });

    it('accumulates multiple errors', () => {
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

      orchestrator.failPhase(error1);
      session.currentPhase.status = 'in_progress';
      orchestrator.failPhase(error2);

      expect(session.currentPhase.errors).toHaveLength(2);
    });
  });

  describe('retryPhase', () => {
    beforeEach(() => {
      orchestrator.startPhase('discovery');
      const error: PhaseError = {
        message: 'Test error',
        code: 'TEST_ERR',
        timestamp: Date.now(),
      };
      orchestrator.failPhase(error);
    });

    it('retries failed phase', () => {
      const context = orchestrator.retryPhase();

      expect(context.status).toBe('in_progress');
      expect(context.retryCount).toBe(1);
      expect(context.startedAt).toBeDefined();
      expect(context.completedAt).toBeUndefined();
    });

    it('increments retry count on multiple retries', () => {
      orchestrator.retryPhase();
      const error: PhaseError = {
        message: 'Test error',
        code: 'TEST_ERR',
        timestamp: Date.now(),
      };
      orchestrator.failPhase(error);

      const context = orchestrator.retryPhase();

      expect(context.retryCount).toBe(2);
    });

    it('throws error when retrying non-failed phase', () => {
      session.currentPhase.status = 'completed';

      expect(() => orchestrator.retryPhase()).toThrow(PhaseTransitionError);
      expect(() => orchestrator.retryPhase()).toThrow(/Cannot retry phase/);
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
    it('prevents starting planning when discovery failed', () => {
      orchestrator.startPhase('discovery');
      const error: PhaseError = {
        message: 'Discovery failed',
        code: 'DISCOVERY_ERR',
        timestamp: Date.now(),
      };
      orchestrator.failPhase(error);

      expect(() => orchestrator.startPhase('planning')).toThrow(PhaseTransitionError);
      expect(() => orchestrator.startPhase('planning')).toThrow(/Stop-the-Line rule/);
    });

    it('prevents starting execution when planning failed', () => {
      orchestrator.startPhase('discovery');
      orchestrator.completePhase();
      orchestrator.startPhase('planning');
      const error: PhaseError = {
        message: 'Planning failed',
        code: 'PLANNING_ERR',
        timestamp: Date.now(),
      };
      orchestrator.failPhase(error);

      expect(() => orchestrator.startPhase('execution')).toThrow(PhaseTransitionError);
      expect(() => orchestrator.startPhase('execution')).toThrow(/Stop-the-Line rule/);
    });

    it('allows progression after failed phase is retried and completed', () => {
      orchestrator.startPhase('discovery');
      const error: PhaseError = {
        message: 'Test error',
        code: 'TEST_ERR',
        timestamp: Date.now(),
      };
      orchestrator.failPhase(error);

      orchestrator.retryPhase();
      orchestrator.completePhase();

      expect(() => orchestrator.startPhase('planning')).not.toThrow();
    });
  });

  describe('full workflow', () => {
    it('completes all phases in order', () => {
      orchestrator.startPhase('discovery');
      orchestrator.completePhase({ 'architecture.md': 'spec' });

      orchestrator.startPhase('planning');
      orchestrator.completePhase({ 'plan.md': 'steps' });

      orchestrator.startPhase('execution');
      orchestrator.completePhase({ 'src/app.ts': 'code' });

      orchestrator.startPhase('verification');
      orchestrator.completePhase({ 'verification.md': 'results' });

      const finalSession = orchestrator.getSession();
      expect(finalSession.currentPhase.phase).toBe('verification');
      expect(finalSession.currentPhase.status).toBe('completed');
      expect(finalSession.history).toHaveLength(4);
    });
  });
});
