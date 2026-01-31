import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PhaseOrchestrator } from './PhaseOrchestrator';
import { GenerationService } from './GenerationService';
import { ProjectService } from './ProjectService';
import { GenerationEventEmitter } from '../websocket/EventEmitter';
import { SessionHandler } from '../websocket/SessionHandler';
import type { LLMProvider, GenerationSession } from '@obsidian/core';
import { WebSocket } from 'ws';

describe('Phase 3 Integration Test - Complete 4-Phase Workflow', () => {
  let mockPrisma: PrismaClient;
  let mockProvider: LLMProvider;
  let projectService: ProjectService;
  let eventEmitter: GenerationEventEmitter;
  let emittedEvents: Array<{ type: string; data: unknown }>;
  const testUserId = 'test-user-phase3';
  const testProjectId = 'test-project-phase3';

  beforeEach(() => {
    emittedEvents = [];

    mockPrisma = {
      project: {
        create: vi.fn().mockResolvedValue({
          id: testProjectId,
          userId: testUserId,
          name: 'Test Project',
          prompt: 'Build a todo app with React',
          appType: 'web-app',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath: `generated-projects/${testUserId}/${testProjectId}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue({
          id: testProjectId,
          userId: testUserId,
          name: 'Test Project',
          prompt: 'Build a todo app with React',
          appType: 'web-app',
          status: 'in_progress',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath: `generated-projects/${testUserId}/${testProjectId}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      specFile: {
        upsert: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      verificationLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    projectService = new ProjectService(mockPrisma);

    mockProvider = {
      chat: vi.fn(),
      stream: vi.fn(),
    };

    eventEmitter = GenerationEventEmitter.getInstance();
    eventEmitter.on('phase:update', (data) => {
      emittedEvents.push({ type: 'phase:update', data });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    emittedEvents = [];
  });

  describe('Complete Workflow Execution', () => {
    it('executes all 4 phases in correct order with state persistence', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: testProjectId,
        prompt: 'Build a todo app with React and TypeScript',
        appType: 'web-app',
        maxRetries: 3,
      });

      const generationService = new GenerationService(session, mockProvider, projectService);

      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify([
          'What styling framework should be used?',
          'Should user authentication be included?',
          'What state management solution is preferred?',
        ]),
        usage: { promptTokens: 120, completionTokens: 60, totalTokens: 180 },
        finishReason: 'stop',
      });

      const questions = await generationService.startDiscovery();
      
      expect(questions).toHaveLength(3);
      expect(questions[0]).toContain('styling');
      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testProjectId },
          data: expect.objectContaining({
            currentPhase: 'discovery',
            phaseStatus: 'awaiting_answers',
          }),
        })
      );

      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: `# Architecture Specification

## Overview
A modern todo application built with React and TypeScript.

## Technology Stack
- Frontend: React 18 with TypeScript
- Styling: Tailwind CSS
- State Management: Redux Toolkit
- Authentication: JWT tokens
- Backend API: RESTful

## Architecture Decisions
1. Component-based architecture
2. Modular structure with separation of concerns
3. Type-safe development with TypeScript`,
        usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
        finishReason: 'stop',
      });

      await generationService.completeDiscoveryWithAnswers({
        'What styling framework should be used?': 'Tailwind CSS',
        'Should user authentication be included?': 'Yes, with JWT',
        'What state management solution is preferred?': 'Redux Toolkit',
      });

      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId_filename: { projectId: testProjectId, filename: 'architecture.md' } },
          create: expect.objectContaining({
            filename: 'architecture.md',
            phase: 'discovery',
          }),
        })
      );

      const architectureContent = `# Architecture Specification

## Overview
A modern todo application built with React and TypeScript.`;

      vi.mocked(mockPrisma.specFile.findUnique).mockResolvedValueOnce({
        id: 'spec-1',
        projectId: testProjectId,
        filename: 'architecture.md',
        content: architectureContent,
        phase: 'discovery',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(mockProvider.chat)
        .mockResolvedValueOnce({
          content: JSON.stringify([
            {
              id: 'step-1',
              title: 'Initialize Project',
              description: 'Set up React project with TypeScript',
            },
            {
              id: 'step-2',
              title: 'Implement Authentication',
              description: 'Create JWT-based authentication system',
            },
            {
              id: 'step-3',
              title: 'Build Todo Components',
              description: 'Create reusable todo list components',
            },
          ]),
          usage: { promptTokens: 250, completionTokens: 120, totalTokens: 370 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify([]),
          usage: { promptTokens: 300, completionTokens: 80, totalTokens: 380 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify([]),
          usage: { promptTokens: 300, completionTokens: 80, totalTokens: 380 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify([]),
          usage: { promptTokens: 300, completionTokens: 80, totalTokens: 380 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: `# Implementation Plan

## Phase 1: Project Setup
- Initialize React + TypeScript project
- Configure Tailwind CSS
- Set up Redux Toolkit store

## Phase 2: Authentication System
- Create login/register components
- Implement JWT token handling
- Add protected routes

## Phase 3: Todo Features
- Build TodoList component
- Create TodoItem component
- Add CRUD operations`,
          usage: { promptTokens: 350, completionTokens: 180, totalTokens: 530 },
          finishReason: 'stop',
        });

      await generationService.startPlanning();

      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId_filename: { projectId: testProjectId, filename: 'plan.md' } },
          create: expect.objectContaining({
            filename: 'plan.md',
            phase: 'planning',
          }),
        })
      );

      const planContent = `# Implementation Plan

## Phase 1: Project Setup`;

      vi.mocked(mockPrisma.specFile.findUnique)
        .mockResolvedValueOnce({
          id: 'spec-1',
          projectId: testProjectId,
          filename: 'architecture.md',
          content: architectureContent,
          phase: 'discovery',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'spec-2',
          projectId: testProjectId,
          filename: 'plan.md',
          content: planContent,
          phase: 'planning',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      vi.mocked(mockProvider.chat)
        .mockResolvedValueOnce({
          content: JSON.stringify(['src/', 'public/', 'tests/', 'src/components/', 'src/store/']),
          usage: { promptTokens: 150, completionTokens: 70, totalTokens: 220 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0',
              '@reduxjs/toolkit': '^1.9.5',
              'react-redux': '^8.1.1',
            },
            devDependencies: {
              typescript: '^5.0.0',
              tailwindcss: '^3.3.0',
              vitest: '^0.34.0',
              '@types/react': '^18.2.0',
            },
          }),
          usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
          finishReason: 'stop',
        });

      await generationService.startExecution();

      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId_filename: { projectId: testProjectId, filename: 'package.json' } },
        })
      );
      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testProjectId },
          data: expect.objectContaining({
            currentPhase: 'execution',
            phaseStatus: 'completed',
          }),
        })
      );

      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify({
          overallStatus: 'passed',
          summary: 'All verification checks passed successfully',
          failedStages: [],
          recommendations: [
            'Consider adding end-to-end tests',
            'Implement CI/CD pipeline',
          ],
          criticalIssues: [],
        }),
        usage: { promptTokens: 250, completionTokens: 120, totalTokens: 370 },
        finishReason: 'stop',
      });

      await generationService.startVerification();

      expect(mockPrisma.verificationLog.create).toHaveBeenCalled();
      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testProjectId },
          data: expect.objectContaining({
            currentPhase: 'verification',
            phaseStatus: 'completed',
          }),
        })
      );

      const finalSession = generationService.getSession();
      expect(finalSession.currentPhase.phase).toBe('verification');
      expect(finalSession.currentPhase.status).toBe('completed');
    });

    it('enforces Stop-the-Line rule on phase failure', async () => {
      const failedProjectId = `${testProjectId}-failed`;
      
      vi.mocked(mockPrisma.project.create).mockResolvedValueOnce({
        id: failedProjectId,
        userId: testUserId,
        name: 'Failed Project',
        prompt: 'Build a broken app',
        appType: 'web-app',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: `generated-projects/${testUserId}/${failedProjectId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: failedProjectId,
        prompt: 'Build a broken app',
        appType: 'web-app',
        maxRetries: 3,
      });

      const generationService = new GenerationService(session, mockProvider, projectService);

      vi.mocked(mockProvider.chat).mockRejectedValueOnce(new Error('LLM API timeout'));

      await expect(generationService.startDiscovery()).rejects.toThrow('Discovery phase failed');

      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: failedProjectId },
          data: expect.objectContaining({
            phaseStatus: 'failed',
          }),
        })
      );

      const orchestrator = new PhaseOrchestrator(
        generationService.getSession(),
        mockPrisma,
        eventEmitter
      );

      await expect(orchestrator.startPhase('planning')).rejects.toThrow(
        /must be completed first/
      );
    });

    it('handles retry logic with exponential backoff', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: testProjectId,
        prompt: 'Build app with retries',
        appType: 'web-app',
        maxRetries: 3,
      });

      const orchestrator = new PhaseOrchestrator(session, mockPrisma, eventEmitter);

      await orchestrator.startPhase('discovery');

      await orchestrator.failPhase({
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        stage: 'discovery',
        timestamp: Date.now(),
      });

      expect(session.currentPhase.status).toBe('failed');
      expect(session.currentPhase.retryCount).toBe(0);

      const startTime = Date.now();
      await orchestrator.retryPhase();
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
      expect(session.currentPhase.status).toBe('in_progress');
      expect(session.currentPhase.retryCount).toBe(1);

      await orchestrator.failPhase({
        message: 'Rate limit exceeded again',
        code: 'RATE_LIMIT',
        stage: 'discovery',
        timestamp: Date.now(),
      });

      expect(session.currentPhase.status).toBe('failed');

      const startTime2 = Date.now();
      await orchestrator.retryPhase();
      const endTime2 = Date.now();

      expect(endTime2 - startTime2).toBeGreaterThanOrEqual(2000);
      expect(session.currentPhase.status).toBe('in_progress');
      expect(session.currentPhase.retryCount).toBe(2);
    });

    it('enforces maximum retry limit', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: testProjectId,
        prompt: 'Build app with max retries',
        appType: 'web-app',
        maxRetries: 3,
      });

      const orchestrator = new PhaseOrchestrator(session, mockPrisma, eventEmitter);

      await orchestrator.startPhase('discovery');

      await orchestrator.failPhase({
        message: 'Failure 1',
        code: 'ERROR',
        stage: 'discovery',
        timestamp: Date.now(),
      });

      await orchestrator.retryPhase();
      expect(session.currentPhase.retryCount).toBe(1);

      await orchestrator.failPhase({
        message: 'Failure 2',
        code: 'ERROR',
        stage: 'discovery',
        timestamp: Date.now(),
      });

      await orchestrator.retryPhase();
      expect(session.currentPhase.retryCount).toBe(2);

      await orchestrator.failPhase({
        message: 'Failure 3',
        code: 'ERROR',
        stage: 'discovery',
        timestamp: Date.now(),
      });

      await orchestrator.retryPhase();
      expect(session.currentPhase.retryCount).toBe(3);

      await orchestrator.failPhase({
        message: 'Failure 4',
        code: 'ERROR',
        stage: 'discovery',
        timestamp: Date.now(),
      });

      await expect(orchestrator.retryPhase()).rejects.toThrow(
        'Maximum retries (3) exceeded'
      );
    }, 15000);
  });

  describe('WebSocket Event Delivery', () => {
    it('emits events throughout complete workflow', async () => {
      const localEvents: Array<{ 
        projectId: string; 
        phase: string; 
        status: string;
        data?: Record<string, unknown>;
      }> = [];
      
      const handler = (eventData: { 
        projectId: string; 
        phase: string; 
        status: string;
        data?: Record<string, unknown>;
      }) => {
        localEvents.push(eventData);
      };
      
      const localEmitter = GenerationEventEmitter.getInstance();
      localEmitter.setMaxListeners(20);
      localEmitter.on('phase:update', handler);

      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: `${testProjectId}-events`,
        prompt: 'Build app for event testing',
        appType: 'web-app',
      });

      const orchestrator = new PhaseOrchestrator(session, mockPrisma, localEmitter);

      await orchestrator.startPhase('discovery');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(localEvents.some(e => 
        e.projectId === `${testProjectId}-events` && 
        e.phase === 'discovery'
      )).toBe(true);

      await orchestrator.completePhase({ 'architecture.md': 'test content' });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(localEvents.some(e => 
        e.projectId === `${testProjectId}-events` &&
        e.status === 'PHASE_CHANGED'
      )).toBe(true);

      await orchestrator.startPhase('planning');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(localEvents.some(e => 
        e.projectId === `${testProjectId}-events` &&
        e.phase === 'planning'
      )).toBe(true);

      expect(localEvents.length).toBeGreaterThan(0);
      
      localEmitter.off('phase:update', handler);
    });

    it('queues events for disconnected clients', async () => {
      const mockWs = {
        send: vi.fn(),
        on: vi.fn(),
        readyState: 1,
      } as unknown as WebSocket;

      const sessionHandler = new SessionHandler(mockPrisma, mockProvider);

      const queueItem = {
        event: {
          type: 'PHASE_CHANGED' as const,
          phase: 'discovery' as const,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      (sessionHandler as unknown as { eventQueue: Map<string, typeof queueItem[]> }).eventQueue.set(
        'test-session',
        [queueItem]
      );

      (sessionHandler as unknown as { sendQueuedEvents: (sessionId: string, ws: WebSocket) => void }).sendQueuedEvents(
        'test-session',
        mockWs
      );

      expect(mockWs.send).toHaveBeenCalled();
    });
  });

  describe('Session Persistence and Recovery', () => {
    it('persists session state after each phase transition', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: testProjectId,
        prompt: 'Build app for persistence test',
        appType: 'web-app',
      });

      const orchestrator = new PhaseOrchestrator(session, mockPrisma, eventEmitter);

      await orchestrator.startPhase('discovery');

      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testProjectId },
          data: expect.objectContaining({
            currentPhase: 'discovery',
            phaseStatus: 'in_progress',
          }),
        })
      );

      await orchestrator.completePhase({ 'architecture.md': 'content' });

      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testProjectId },
          data: expect.objectContaining({
            currentPhase: 'discovery',
            phaseStatus: 'completed',
          }),
        })
      );
    });

    it('recovers session state from database', async () => {
      const storedSession: GenerationSession = {
        id: 'session-recovery',
        userId: testUserId,
        projectId: testProjectId,
        prompt: 'Recovered app',
        appType: 'web-app',
        currentPhase: {
          phase: 'planning',
          status: 'in_progress',
          artifacts: { 'architecture.md': 'stored content' },
          errors: [],
          retryCount: 0,
          startedAt: Date.now() - 60000,
        },
        history: [
          {
            phase: 'discovery',
            status: 'completed',
            artifacts: { 'architecture.md': 'stored content' },
            errors: [],
            retryCount: 0,
            startedAt: Date.now() - 120000,
            completedAt: Date.now() - 60000,
          },
        ],
        config: {
          maxRetries: 3,
        },
        createdAt: Date.now() - 180000,
        updatedAt: Date.now() - 60000,
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValueOnce({
        id: testProjectId,
        userId: testUserId,
        name: 'Test Project',
        prompt: 'Recovered app',
        appType: 'web-app',
        status: 'in_progress',
        currentPhase: 'planning',
        phaseStatus: 'in_progress',
        filesPath: `generated-projects/${testUserId}/${testProjectId}`,
        createdAt: new Date(storedSession.createdAt),
        updatedAt: new Date(storedSession.updatedAt),
      });

      const orchestrator = new PhaseOrchestrator(storedSession, mockPrisma, eventEmitter);
      const session = orchestrator.getSession();

      expect(session.currentPhase.phase).toBe('planning');
      expect(session.currentPhase.status).toBe('in_progress');
      expect(session.history).toHaveLength(1);
      expect(session.history[0].phase).toBe('discovery');
      expect(session.history[0].status).toBe('completed');
    });
  });

  describe('Artifact Storage and Retrieval', () => {
    it('stores artifacts in database on phase completion', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: testProjectId,
        prompt: 'Build app for artifact test',
        appType: 'web-app',
      });

      const orchestrator = new PhaseOrchestrator(session, mockPrisma, eventEmitter);

      await orchestrator.startPhase('discovery');
      await orchestrator.completePhase({
        'architecture.md': '# Architecture\n\nTest content',
      });

      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId_filename: {
              projectId: testProjectId,
              filename: 'architecture.md',
            },
          },
          create: expect.objectContaining({
            projectId: testProjectId,
            filename: 'architecture.md',
            content: '# Architecture\n\nTest content',
            phase: 'discovery',
          }),
          update: expect.objectContaining({
            content: '# Architecture\n\nTest content',
          }),
        })
      );
    });

    it('retrieves artifacts for phase execution', async () => {
      vi.mocked(mockPrisma.specFile.findUnique).mockResolvedValueOnce({
        id: 'artifact-1',
        projectId: testProjectId,
        filename: 'architecture.md',
        content: '# Architecture\n\nRetrieved content',
        phase: 'discovery',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const artifact = await projectService.getSpecFile(testProjectId, 'architecture.md');

      expect(artifact).not.toBeNull();
      expect(artifact?.content).toContain('Retrieved content');
    });

    it('handles multiple artifacts per phase', async () => {
      vi.clearAllMocks();

      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: testProjectId,
        prompt: 'Build app with multiple artifacts',
        appType: 'web-app',
      });

      const orchestrator = new PhaseOrchestrator(session, mockPrisma, eventEmitter);

      await orchestrator.startPhase('discovery');
      await orchestrator.completePhase({ 'architecture.md': 'content' });
      await orchestrator.startPhase('planning');
      await orchestrator.completePhase({ 'plan.md': 'content' });
      await orchestrator.startPhase('execution');
      await orchestrator.completePhase({
        'package.json': '{"name": "test"}',
        'tsconfig.json': '{"compilerOptions": {}}',
        'README.md': '# Test Project',
      });

      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId_filename: { projectId: testProjectId, filename: 'package.json' },
          },
        })
      );
      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId_filename: { projectId: testProjectId, filename: 'tsconfig.json' },
          },
        })
      );
      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId_filename: { projectId: testProjectId, filename: 'README.md' },
          },
        })
      );
    });
  });

  describe('Fallback Mechanism', () => {
    it('triggers fallback on primary provider failure', async () => {
      let callCount = 0;
      const primaryProvider: LLMProvider = {
        chat: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Primary provider failed');
          }
          return {
            content: JSON.stringify(['Primary question']),
            usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
            finishReason: 'stop' as const,
          };
        }),
        stream: vi.fn(),
      };

      const session1 = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: `${testProjectId}-fallback-1`,
        prompt: 'Build app with fallback',
        appType: 'web-app',
      });

      const generationService = new GenerationService(
        session1,
        primaryProvider,
        projectService
      );

      const questions = await generationService.startDiscovery();
      expect(questions).toHaveLength(1);
      expect(questions[0]).toBe('Primary question');
      expect(callCount).toBe(2);
    });
  });

  describe('Phase Prerequisite Enforcement', () => {
    it('prevents skipping phases', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: testProjectId,
        prompt: 'Build app for phase skip test',
        appType: 'web-app',
      });

      const orchestrator = new PhaseOrchestrator(session, mockPrisma, eventEmitter);

      await expect(orchestrator.startPhase('planning')).rejects.toThrow(
        /must be completed first/
      );

      await expect(orchestrator.startPhase('execution')).rejects.toThrow(
        /Invalid phase progression/
      );

      await expect(orchestrator.startPhase('verification')).rejects.toThrow(
        /Invalid phase progression/
      );
    });

    it('enforces phase completion before progressing', async () => {
      const session = await PhaseOrchestrator.createSession(mockPrisma, {
        userId: testUserId,
        projectId: testProjectId,
        prompt: 'Build app for completion test',
        appType: 'web-app',
      });

      const orchestrator = new PhaseOrchestrator(session, mockPrisma, eventEmitter);

      await orchestrator.startPhase('discovery');

      expect(session.currentPhase.status).toBe('in_progress');

      await expect(orchestrator.startPhase('planning')).rejects.toThrow(
        /must be completed first/
      );

      await orchestrator.completePhase({ 'architecture.md': 'content' });

      await expect(orchestrator.startPhase('planning')).resolves.not.toThrow();
    });
  });
});
