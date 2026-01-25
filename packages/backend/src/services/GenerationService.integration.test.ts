import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenerationService } from './GenerationService';
import { ProjectService } from './ProjectService';
import type { GenerationSession, LLMProvider } from '@obsidian/core';
import { PrismaClient } from '@prisma/client';

describe('GenerationService - Integration Tests', () => {
  let mockProvider: LLMProvider;
  let projectService: ProjectService;
  let mockPrisma: PrismaClient;
  let session: GenerationSession;

  beforeEach(() => {
    mockPrisma = {
      project: {
        update: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue({
          id: 'project-1',
          userId: 'user-1',
          name: 'Test Project',
          prompt: 'Build a todo app',
          appType: 'web-app',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath: 'projects/user-1/123',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      specFile: {
        upsert: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue({
          id: 'spec-1',
          projectId: 'project-1',
          filename: 'architecture.md',
          content: '# Architecture\n\n## Overview\nTodo app',
          phase: 'discovery',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
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

    session = {
      id: 'session-1',
      userId: 'user-1',
      projectId: 'project-1',
      prompt: 'Build a todo app with React',
      appType: 'web-app',
      currentPhase: {
        phase: 'discovery',
        status: 'pending',
        artifacts: {},
        errors: [],
        retryCount: 0,
      },
      history: [],
      config: {
        llmConfigId: 'config-1',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  describe('Complete 4-Phase Workflow', () => {
    it('executes full generation workflow from discovery to verification', async () => {
      const generationService = new GenerationService(session, mockProvider, projectService);

      // Phase 1: Discovery - Generate questions
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify([
          'What styling approach should be used?',
          'Is authentication needed?',
        ]),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const questions = await generationService.startDiscovery();
      expect(questions).toHaveLength(2);
      expect(questions[0]).toBe('What styling approach should be used?');

      // Phase 1: Discovery - Submit answers
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: '# Architecture\n\n## Overview\nTodo app with React and TypeScript',
        usage: { promptTokens: 150, completionTokens: 200, totalTokens: 350 },
        finishReason: 'stop',
      });

      await generationService.completeDiscoveryWithAnswers({
        'What styling approach should be used?': 'Tailwind CSS',
        'Is authentication needed?': 'Yes, JWT tokens',
      });

      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId_filename: { projectId: 'project-1', filename: 'architecture.md' } },
        })
      );

      // Phase 2: Planning
      // Mock 1: breakdownSteps
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify([
          { id: 'step-1', title: 'Setup project', description: 'Initialize React app' },
          { id: 'step-2', title: 'Add components', description: 'Create todo components' },
        ]),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        finishReason: 'stop',
      });

      // Mock 2: performRedTeaming for step-1
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify([]),
        usage: { promptTokens: 250, completionTokens: 80, totalTokens: 330 },
        finishReason: 'stop',
      });

      // Mock 3: performRedTeaming for step-2
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify([]),
        usage: { promptTokens: 250, completionTokens: 80, totalTokens: 330 },
        finishReason: 'stop',
      });

      // Mock 4: generatePlan
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: '# Implementation Plan\n\n## Step 1: Setup\nInitialize React',
        usage: { promptTokens: 300, completionTokens: 150, totalTokens: 450 },
        finishReason: 'stop',
      });

      await generationService.startPlanning();
      
      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId_filename: { projectId: 'project-1', filename: 'plan.md' } },
        })
      );

      // Phase 3: Execution
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify(['src/', 'public/', 'tests/']),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify({
          dependencies: { react: '^18.0.0', typescript: '^5.0.0' },
          devDependencies: { vitest: '^4.0.0', eslint: '^8.0.0' },
        }),
        usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
        finishReason: 'stop',
      });

      await generationService.startExecution();
      
      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId_filename: { projectId: 'project-1', filename: 'package.json' } },
        })
      );

      // Phase 4: Verification
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify({
          overallStatus: 'passed',
          summary: 'All checks passed',
          failedStages: [],
          recommendations: ['Consider adding integration tests'],
          criticalIssues: [],
        }),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        finishReason: 'stop',
      });

      await generationService.startVerification();

      expect(mockPrisma.verificationLog.create).toHaveBeenCalled();
      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'project-1' },
          data: expect.objectContaining({
            currentPhase: 'verification',
            phaseStatus: 'completed',
          }),
        })
      );
    });

    it('handles phase errors correctly', async () => {
      const generationService = new GenerationService(session, mockProvider, projectService);

      vi.mocked(mockProvider.chat).mockRejectedValueOnce(new Error('LLM API error'));

      await expect(generationService.startDiscovery()).rejects.toThrow('Discovery phase failed');

      expect(mockPrisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'project-1' },
          data: expect.objectContaining({
            phaseStatus: 'failed',
          }),
        })
      );
    });

    it('emits phase update events throughout workflow', async () => {
      const generationService = new GenerationService(session, mockProvider, projectService);
      const updateCallback = vi.fn();
      generationService.setPhaseUpdateCallback(updateCallback);

      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify(['What is the test question?']),
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
        finishReason: 'stop',
      });

      await generationService.startDiscovery();

      expect(updateCallback).toHaveBeenCalledWith('discovery', 'in_progress', undefined);
      expect(updateCallback).toHaveBeenCalledWith(
        'discovery',
        'awaiting_answers',
        expect.objectContaining({
          questions: expect.any(Array),
        })
      );
    });
  });

  describe('Phase Prerequisites Enforcement', () => {
    it('prevents planning phase before discovery is completed', async () => {
      session.currentPhase.phase = 'discovery';
      session.currentPhase.status = 'in_progress';

      const generationService = new GenerationService(session, mockProvider, projectService);

      await expect(generationService.startPlanning()).rejects.toThrow(
        'Planning phase failed'
      );
    });

    it('prevents execution phase before planning is completed', async () => {
      session.currentPhase.phase = 'planning';
      session.currentPhase.status = 'in_progress';

      const generationService = new GenerationService(session, mockProvider, projectService);

      await expect(generationService.startExecution()).rejects.toThrow(
        'Execution phase failed'
      );
    });

    it('prevents verification phase before execution is completed', async () => {
      session.currentPhase.phase = 'execution';
      session.currentPhase.status = 'in_progress';

      const generationService = new GenerationService(session, mockProvider, projectService);

      await expect(generationService.startVerification()).rejects.toThrow(
        'Verification phase failed'
      );
    });
  });

  describe('runFullGeneration', () => {
    it('executes complete workflow with answers', async () => {
      const generationService = new GenerationService(session, mockProvider, projectService);

      // Mock all LLM responses for the full workflow
      vi.mocked(mockProvider.chat)
        .mockResolvedValueOnce({
          content: JSON.stringify(['What framework to use?']),
          usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: '# Architecture\n\nReact app',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify([{ id: '1', title: 'Setup', description: 'Init' }]),
          usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify([]),
          usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: '# Plan\n\nStep 1: Init',
          usage: { promptTokens: 250, completionTokens: 100, totalTokens: 350 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify(['src/', 'public/']),
          usage: { promptTokens: 100, completionTokens: 40, totalTokens: 140 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            dependencies: { react: '^18.0.0' },
            devDependencies: { vitest: '^4.0.0' },
          }),
          usage: { promptTokens: 150, completionTokens: 60, totalTokens: 210 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            overallStatus: 'passed',
            summary: 'All good',
            failedStages: [],
            recommendations: [],
            criticalIssues: [],
          }),
          usage: { promptTokens: 200, completionTokens: 80, totalTokens: 280 },
          finishReason: 'stop',
        });

      await generationService.runFullGeneration({ 'What framework to use?': 'React' });

      const finalSession = generationService.getSession();
      expect(finalSession.currentPhase.phase).toBe('verification');
      expect(finalSession.currentPhase.status).toBe('completed');
      expect(mockPrisma.project.update).toHaveBeenCalled();
    });
  });
});
