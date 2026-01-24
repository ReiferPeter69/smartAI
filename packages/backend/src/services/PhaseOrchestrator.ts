import type {
  Phase,
  PhaseStatus,
  PhaseContext,
  PhaseError,
  GenerationSession,
} from '@obsidian/core';

export class PhaseTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhaseTransitionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

const PHASE_ORDER: Phase[] = ['discovery', 'planning', 'execution', 'verification'];

const VALID_TRANSITIONS: Record<PhaseStatus, PhaseStatus[]> = {
  pending: ['in_progress'],
  in_progress: ['completed', 'failed'],
  completed: [],
  failed: ['in_progress'],
};

export class PhaseOrchestrator {
  private session: GenerationSession;

  constructor(session: GenerationSession) {
    this.session = session;
  }

  startPhase(phase: Phase): PhaseContext {
    this.validatePhaseProgression(phase);

    if (phase === this.session.currentPhase.phase) {
      this.validateStatusTransition(this.session.currentPhase.status, 'in_progress');
    }

    const newContext: PhaseContext = {
      phase,
      status: 'in_progress',
      artifacts: {},
      errors: [],
      retryCount: 0,
      startedAt: Date.now(),
    };

    this.session.history.push({ ...this.session.currentPhase });
    this.session.currentPhase = newContext;
    this.session.updatedAt = Date.now();

    return newContext;
  }

  completePhase(artifacts: Record<string, string> = {}): PhaseContext {
    this.validateStatusTransition(this.session.currentPhase.status, 'completed');

    this.session.currentPhase.status = 'completed';
    this.session.currentPhase.artifacts = { ...this.session.currentPhase.artifacts, ...artifacts };
    this.session.currentPhase.completedAt = Date.now();
    this.session.updatedAt = Date.now();

    return this.session.currentPhase;
  }

  failPhase(error: PhaseError): PhaseContext {
    this.validateStatusTransition(this.session.currentPhase.status, 'failed');

    this.session.currentPhase.status = 'failed';
    this.session.currentPhase.errors.push(error);
    this.session.currentPhase.completedAt = Date.now();
    this.session.updatedAt = Date.now();

    return this.session.currentPhase;
  }

  retryPhase(): PhaseContext {
    if (this.session.currentPhase.status !== 'failed') {
      throw new PhaseTransitionError(
        `Cannot retry phase with status: ${this.session.currentPhase.status}`
      );
    }

    this.session.currentPhase.status = 'in_progress';
    this.session.currentPhase.retryCount += 1;
    this.session.currentPhase.startedAt = Date.now();
    this.session.currentPhase.completedAt = undefined;
    this.session.updatedAt = Date.now();

    return this.session.currentPhase;
  }

  canProgressToNextPhase(): boolean {
    const currentPhase = this.session.currentPhase;

    if (currentPhase.status !== 'completed') {
      return false;
    }

    if (currentPhase.phase === 'verification') {
      return false;
    }

    return true;
  }

  getNextPhase(): Phase | null {
    if (!this.canProgressToNextPhase()) {
      return null;
    }

    const currentIndex = PHASE_ORDER.indexOf(this.session.currentPhase.phase);
    if (currentIndex === -1 || currentIndex === PHASE_ORDER.length - 1) {
      return null;
    }

    return PHASE_ORDER[currentIndex + 1];
  }

  getSession(): GenerationSession {
    return this.session;
  }

  private validatePhaseProgression(targetPhase: Phase): void {
    const currentPhase = this.session.currentPhase.phase;
    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    const targetIndex = PHASE_ORDER.indexOf(targetPhase);

    if (targetIndex === -1) {
      throw new PhaseTransitionError(`Invalid phase: ${targetPhase}`);
    }

    if (targetPhase === currentPhase) {
      if (this.session.currentPhase.status === 'pending' || this.session.currentPhase.status === 'failed') {
        return;
      }
      throw new PhaseTransitionError(
        `Cannot restart phase ${currentPhase} with status ${this.session.currentPhase.status}`
      );
    }

    if (targetIndex !== currentIndex + 1) {
      throw new PhaseTransitionError(
        `Invalid phase progression: cannot move from ${currentPhase} to ${targetPhase}. ` +
          `Expected next phase: ${PHASE_ORDER[currentIndex + 1] || 'none'}`
      );
    }

    if (this.session.currentPhase.status !== 'completed') {
      throw new PhaseTransitionError(
        `Cannot start ${targetPhase} phase: current phase ${currentPhase} must be completed first (Stop-the-Line rule)`
      );
    }
  }

  private validateStatusTransition(from: PhaseStatus, to: PhaseStatus): void {
    const validTransitions = VALID_TRANSITIONS[from];

    if (!validTransitions || !validTransitions.includes(to)) {
      throw new PhaseTransitionError(
        `Invalid status transition: ${from} → ${to}. Valid transitions from ${from}: ${validTransitions?.join(', ') || 'none'}`
      );
    }
  }
}
