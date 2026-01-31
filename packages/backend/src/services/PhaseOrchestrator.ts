import type {
  Phase,
  PhaseStatus,
  PhaseContext,
  PhaseError,
  GenerationSession,
} from '@obsidian/core';
import { PrismaClient } from '@prisma/client';
import { GenerationEventEmitter } from '../websocket/EventEmitter';
import { createId } from '@paralleldrive/cuid2';

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

const RETRY_BACKOFF_MS = [1000, 2000, 4000];
const MAX_RETRIES = 3;

export interface CreateSessionOptions {
  userId: string;
  projectId?: string;
  prompt: string;
  appType: string;
  llmConfigId?: string;
  timeout?: number;
  maxRetries?: number;
}

export class PhaseOrchestrator {
  private session: GenerationSession;
  private prisma?: PrismaClient;
  private eventEmitter?: GenerationEventEmitter;

  constructor(
    session: GenerationSession,
    prisma?: PrismaClient,
    eventEmitter?: GenerationEventEmitter
  ) {
    this.session = session;
    this.prisma = prisma;
    this.eventEmitter = eventEmitter;
  }

  static async createSession(
    prisma: PrismaClient,
    options: CreateSessionOptions
  ): Promise<GenerationSession> {
    const sessionId = createId();
    const projectId = options.projectId || createId();
    const now = Date.now();

    await prisma.project.create({
      data: {
        id: projectId,
        name: `Project-${sessionId.slice(0, 8)}`,
        prompt: options.prompt,
        appType: options.appType,
        userId: options.userId,
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: `generated-projects/${options.userId}/${projectId}`,
      },
    });

    const session: GenerationSession = {
      id: sessionId,
      userId: options.userId,
      projectId,
      prompt: options.prompt,
      appType: options.appType,
      currentPhase: {
        phase: 'discovery',
        status: 'pending',
        artifacts: {},
        errors: [],
        retryCount: 0,
      },
      history: [],
      config: {
        llmConfigId: options.llmConfigId,
        timeout: options.timeout,
        maxRetries: options.maxRetries || MAX_RETRIES,
      },
      createdAt: now,
      updatedAt: now,
    };

    return session;
  }

  async startPhase(phase: Phase): Promise<PhaseContext> {
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

    await this.persistSession();
    this.emitEvent('PHASE_CHANGED', {
      phase,
      status: 'in_progress',
      sessionId: this.session.id,
    });

    return newContext;
  }

  async completePhase(artifacts: Record<string, string> = {}): Promise<PhaseContext> {
    this.validateStatusTransition(this.session.currentPhase.status, 'completed');

    this.session.currentPhase.status = 'completed';
    this.session.currentPhase.artifacts = { ...this.session.currentPhase.artifacts, ...artifacts };
    this.session.currentPhase.completedAt = Date.now();
    this.session.updatedAt = Date.now();

    await this.persistSession();
    await this.persistArtifacts(artifacts);

    this.emitEvent('PHASE_CHANGED', {
      phase: this.session.currentPhase.phase,
      status: 'completed',
      sessionId: this.session.id,
      artifacts: Object.keys(artifacts),
    });

    if (Object.keys(artifacts).some((key) => key.includes('architecture.md') || key.includes('plan.md'))) {
      this.emitEvent('SPEC_GENERATED', {
        sessionId: this.session.id,
        phase: this.session.currentPhase.phase,
        artifacts: Object.keys(artifacts),
      });
    }

    return this.session.currentPhase;
  }

  async failPhase(error: PhaseError): Promise<PhaseContext> {
    this.validateStatusTransition(this.session.currentPhase.status, 'failed');

    this.session.currentPhase.status = 'failed';
    this.session.currentPhase.errors.push(error);
    this.session.currentPhase.completedAt = Date.now();
    this.session.updatedAt = Date.now();

    await this.persistSession();

    this.emitEvent('PHASE_FAILED', {
      phase: this.session.currentPhase.phase,
      sessionId: this.session.id,
      error: error.message,
      retryCount: this.session.currentPhase.retryCount,
    });

    return this.session.currentPhase;
  }

  async retryPhase(): Promise<PhaseContext> {
    if (this.session.currentPhase.status !== 'failed') {
      throw new PhaseTransitionError(
        `Cannot retry phase with status: ${this.session.currentPhase.status}`
      );
    }

    const maxRetries = this.session.config.maxRetries || MAX_RETRIES;
    if (this.session.currentPhase.retryCount >= maxRetries) {
      throw new PhaseTransitionError(
        `Maximum retries (${maxRetries}) exceeded for phase: ${this.session.currentPhase.phase}`
      );
    }

    const backoffDelay = RETRY_BACKOFF_MS[this.session.currentPhase.retryCount] || RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
    await this.delay(backoffDelay);

    this.session.currentPhase.status = 'in_progress';
    this.session.currentPhase.retryCount += 1;
    this.session.currentPhase.startedAt = Date.now();
    this.session.currentPhase.completedAt = undefined;
    this.session.updatedAt = Date.now();

    await this.persistSession();

    this.emitEvent('PHASE_CHANGED', {
      phase: this.session.currentPhase.phase,
      status: 'in_progress',
      sessionId: this.session.id,
      retryCount: this.session.currentPhase.retryCount,
    });

    return this.session.currentPhase;
  }

  private async persistSession(): Promise<void> {
    if (!this.prisma) {
      return;
    }

    try {
      await this.prisma.project.update({
        where: { id: this.session.projectId },
        data: {
          currentPhase: this.session.currentPhase.phase,
          phaseStatus: this.session.currentPhase.status,
          status: this.determineProjectStatus(),
          updatedAt: new Date(this.session.updatedAt),
        },
      });
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  }

  private async persistArtifacts(artifacts: Record<string, string>): Promise<void> {
    if (!this.prisma) {
      return;
    }

    try {
      const phase = this.session.currentPhase.phase;
      for (const [filename, content] of Object.entries(artifacts)) {
        if (content && typeof content === 'string' && filename.includes('.')) {
          await this.prisma.specFile.upsert({
            where: {
              projectId_filename: {
                projectId: this.session.projectId,
                filename,
              },
            },
            update: { content },
            create: {
              projectId: this.session.projectId,
              filename,
              content,
              phase,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to persist artifacts:', error);
    }
  }

  private emitEvent(eventType: string, data: Record<string, unknown>): void {
    if (!this.eventEmitter) {
      return;
    }

    this.eventEmitter.emitPhaseUpdate({
      projectId: this.session.projectId,
      phase: this.session.currentPhase.phase,
      status: eventType,
      data,
      timestamp: Date.now(),
    });
  }

  private determineProjectStatus(): string {
    if (this.session.currentPhase.status === 'failed') {
      return 'failed';
    }
    if (this.session.currentPhase.phase === 'verification' && this.session.currentPhase.status === 'completed') {
      return 'completed';
    }
    if (this.session.currentPhase.status === 'in_progress') {
      return 'in_progress';
    }
    return 'pending';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
