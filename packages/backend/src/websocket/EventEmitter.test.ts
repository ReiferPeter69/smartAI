import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenerationEventEmitter, PhaseUpdateEvent } from './EventEmitter';

describe('GenerationEventEmitter', () => {
  let emitter: GenerationEventEmitter;

  beforeEach(() => {
    emitter = GenerationEventEmitter.getInstance();
    emitter.removeAllListeners();
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = GenerationEventEmitter.getInstance();
      const instance2 = GenerationEventEmitter.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('emitPhaseUpdate', () => {
    it('emits both global and project-specific events', () => {
      const globalCallback = vi.fn();
      const projectCallback = vi.fn();

      emitter.on('phase:update', globalCallback);
      emitter.on('phase:update:project-1', projectCallback);

      const event: PhaseUpdateEvent = {
        projectId: 'project-1',
        phase: 'discovery',
        status: 'in_progress',
        timestamp: Date.now(),
      };

      emitter.emitPhaseUpdate(event);

      expect(globalCallback).toHaveBeenCalledWith(event);
      expect(projectCallback).toHaveBeenCalledWith(event);
    });

    it('emits event with data', () => {
      const callback = vi.fn();
      emitter.subscribeToProject('project-2', callback);

      const event: PhaseUpdateEvent = {
        projectId: 'project-2',
        phase: 'planning',
        status: 'completed',
        data: { steps: 5, artifact: 'plan.md' },
        timestamp: Date.now(),
      };

      emitter.emitPhaseUpdate(event);

      expect(callback).toHaveBeenCalledWith(event);
      expect(callback.mock.calls[0][0].data).toEqual({ steps: 5, artifact: 'plan.md' });
    });
  });

  describe('subscribeToProject', () => {
    it('subscribes to project-specific updates', () => {
      const callback = vi.fn();
      emitter.subscribeToProject('project-1', callback);

      const event: PhaseUpdateEvent = {
        projectId: 'project-1',
        phase: 'execution',
        status: 'in_progress',
        timestamp: Date.now(),
      };

      emitter.emitPhaseUpdate(event);

      expect(callback).toHaveBeenCalledWith(event);
    });

    it('does not receive updates from other projects', () => {
      const callback = vi.fn();
      emitter.subscribeToProject('project-1', callback);

      const event: PhaseUpdateEvent = {
        projectId: 'project-2',
        phase: 'discovery',
        status: 'in_progress',
        timestamp: Date.now(),
      };

      emitter.emitPhaseUpdate(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('allows multiple subscribers to the same project', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.subscribeToProject('project-1', callback1);
      emitter.subscribeToProject('project-1', callback2);

      const event: PhaseUpdateEvent = {
        projectId: 'project-1',
        phase: 'verification',
        status: 'completed',
        timestamp: Date.now(),
      };

      emitter.emitPhaseUpdate(event);

      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledWith(event);
    });
  });

  describe('unsubscribeFromProject', () => {
    it('removes project subscription', () => {
      const callback = vi.fn();
      emitter.subscribeToProject('project-1', callback);
      emitter.unsubscribeFromProject('project-1', callback);

      const event: PhaseUpdateEvent = {
        projectId: 'project-1',
        phase: 'discovery',
        status: 'in_progress',
        timestamp: Date.now(),
      };

      emitter.emitPhaseUpdate(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('only removes the specific callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.subscribeToProject('project-1', callback1);
      emitter.subscribeToProject('project-1', callback2);
      emitter.unsubscribeFromProject('project-1', callback1);

      const event: PhaseUpdateEvent = {
        projectId: 'project-1',
        phase: 'planning',
        status: 'in_progress',
        timestamp: Date.now(),
      };

      emitter.emitPhaseUpdate(event);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith(event);
    });
  });

  describe('subscribeToAllUpdates', () => {
    it('receives updates from all projects', () => {
      const callback = vi.fn();
      emitter.subscribeToAllUpdates(callback);

      const event1: PhaseUpdateEvent = {
        projectId: 'project-1',
        phase: 'discovery',
        status: 'in_progress',
        timestamp: Date.now(),
      };

      const event2: PhaseUpdateEvent = {
        projectId: 'project-2',
        phase: 'execution',
        status: 'completed',
        timestamp: Date.now(),
      };

      emitter.emitPhaseUpdate(event1);
      emitter.emitPhaseUpdate(event2);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, event1);
      expect(callback).toHaveBeenNthCalledWith(2, event2);
    });
  });

  describe('unsubscribeFromAllUpdates', () => {
    it('removes global subscription', () => {
      const callback = vi.fn();
      emitter.subscribeToAllUpdates(callback);
      emitter.unsubscribeFromAllUpdates(callback);

      const event: PhaseUpdateEvent = {
        projectId: 'project-1',
        phase: 'discovery',
        status: 'in_progress',
        timestamp: Date.now(),
      };

      emitter.emitPhaseUpdate(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('multiple event types', () => {
    it('handles multiple phases correctly', () => {
      const callback = vi.fn();
      emitter.subscribeToProject('project-1', callback);

      const phases: PhaseUpdateEvent[] = [
        { projectId: 'project-1', phase: 'discovery', status: 'in_progress', timestamp: Date.now() },
        { projectId: 'project-1', phase: 'discovery', status: 'completed', timestamp: Date.now() },
        { projectId: 'project-1', phase: 'planning', status: 'in_progress', timestamp: Date.now() },
        { projectId: 'project-1', phase: 'planning', status: 'completed', timestamp: Date.now() },
      ];

      phases.forEach((event) => emitter.emitPhaseUpdate(event));

      expect(callback).toHaveBeenCalledTimes(4);
      phases.forEach((event, index) => {
        expect(callback).toHaveBeenNthCalledWith(index + 1, event);
      });
    });
  });
});
