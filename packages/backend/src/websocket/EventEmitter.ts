import { EventEmitter as NodeEventEmitter } from 'events';
import type { Phase } from '@obsidian/core';

export interface PhaseUpdateEvent {
  projectId: string;
  phase: Phase;
  status: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export class GenerationEventEmitter extends NodeEventEmitter {
  private static instance: GenerationEventEmitter;

  private constructor() {
    super();
  }

  static getInstance(): GenerationEventEmitter {
    if (!GenerationEventEmitter.instance) {
      GenerationEventEmitter.instance = new GenerationEventEmitter();
    }
    return GenerationEventEmitter.instance;
  }

  emitPhaseUpdate(event: PhaseUpdateEvent): void {
    this.emit('phase:update', event);
    this.emit(`phase:update:${event.projectId}`, event);
  }

  subscribeToProject(projectId: string, callback: (event: PhaseUpdateEvent) => void): void {
    this.on(`phase:update:${projectId}`, callback);
  }

  unsubscribeFromProject(projectId: string, callback: (event: PhaseUpdateEvent) => void): void {
    this.off(`phase:update:${projectId}`, callback);
  }

  subscribeToAllUpdates(callback: (event: PhaseUpdateEvent) => void): void {
    this.on('phase:update', callback);
  }

  unsubscribeFromAllUpdates(callback: (event: PhaseUpdateEvent) => void): void {
    this.off('phase:update', callback);
  }
}
