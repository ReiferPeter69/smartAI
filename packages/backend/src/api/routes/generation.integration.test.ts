import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createGenerationRouter } from './generation';
import { PrismaClient } from '@prisma/client';
import type { LLMProvider } from '@obsidian/core';
import { ProviderFactory } from '../../llm/ProviderFactory';

vi.mock('../../llm/ProviderFactory');
vi.mock('../middleware/auth', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { userId: 'user-1' };
    next();
  },
}));

describe('Generation API Routes - Integration Tests', () => {
  let app: Express;
  let mockPrisma: PrismaClient;
  let mockProvider: LLMProvider;

  beforeEach(() => {
    mockProvider = {
      chat: vi.fn(),
      stream: vi.fn(),
    };

    vi.mocked(ProviderFactory.createProvider).mockResolvedValue(mockProvider);

    mockPrisma = {
      project: {
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
        update: vi.fn().mockResolvedValue({}),
      },
      lLMConfig: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'config-1',
          userId: 'user-1',
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key',
          endpoint: null,
          isDefault: true,
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
          content: '# Architecture\n\nTodo app',
          phase: 'discovery',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      verificationLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    app = express();
    app.use(express.json());
    app.use('/api/generation', createGenerationRouter(mockPrisma));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message || 'Internal server error' });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/generation/discovery/start', () => {
    it('starts discovery phase and returns questions', async () => {
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify(['What styling framework?', 'Need authentication?']),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const response = await request(app)
        .post('/api/generation/discovery/start')
        .send({ projectId: 'project-1' })
        .expect(200);

      expect(response.body).toMatchObject({
        questions: ['What styling framework?', 'Need authentication?'],
        phase: 'discovery',
        status: 'awaiting_answers',
      });
      expect(response.body.sessionId).toBeDefined();
    });

    it('returns 404 if project not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValueOnce(null);

      await request(app)
        .post('/api/generation/discovery/start')
        .send({ projectId: 'nonexistent' })
        .expect(404);
    });

    it('returns 403 if user does not own project', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValueOnce({
        id: 'project-1',
        userId: 'other-user',
        name: 'Test Project',
        prompt: 'Build app',
        appType: 'web-app',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'projects/other-user/123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await request(app)
        .post('/api/generation/discovery/start')
        .send({ projectId: 'project-1' })
        .expect(403);
    });

    it('returns 400 if no LLM config found', async () => {
      vi.mocked(mockPrisma.lLMConfig.findFirst).mockResolvedValue(null);

      await request(app)
        .post('/api/generation/discovery/start')
        .send({ projectId: 'project-1' })
        .expect(400);
    });
  });

  describe('POST /api/generation/discovery/submit', () => {
    it('submits answers and completes discovery phase', async () => {
      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: '# Architecture\n\n## Overview\nTodo app with React',
        usage: { promptTokens: 150, completionTokens: 200, totalTokens: 350 },
        finishReason: 'stop',
      });

      const response = await request(app)
        .post('/api/generation/discovery/submit-answers')
        .send({
          projectId: 'project-1',
          answers: {
            'What styling framework?': 'Tailwind CSS',
            'Need authentication?': 'Yes',
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        phase: 'discovery',
        status: 'completed',
      });
      expect(mockPrisma.specFile.upsert).toHaveBeenCalled();
    });

    it('returns 404 if project not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValueOnce(null);

      await request(app)
        .post('/api/generation/discovery/submit-answers')
        .send({
          projectId: 'nonexistent',
          answers: { q1: 'answer' },
        })
        .expect(404);
    });
  });

  describe('POST /api/generation/planning/start', () => {
    it('starts planning phase successfully', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValueOnce({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        prompt: 'Build a todo app',
        appType: 'web-app',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'completed',
        filesPath: 'projects/user-1/123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(mockProvider.chat)
        .mockResolvedValueOnce({
          content: JSON.stringify([
            { id: 'step-1', title: 'Setup', description: 'Initialize project' },
          ]),
          usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify([]),
          usage: { promptTokens: 250, completionTokens: 80, totalTokens: 330 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: '# Plan\n\n## Step 1: Setup',
          usage: { promptTokens: 300, completionTokens: 150, totalTokens: 450 },
          finishReason: 'stop',
        });

      const response = await request(app)
        .post('/api/generation/planning/start')
        .send({ projectId: 'project-1' })
        .expect(200);
      expect(response.body).toMatchObject({
        phase: 'planning',
        status: 'completed',
      });
      expect(mockPrisma.specFile.upsert).toHaveBeenCalled();
    });
  });

  describe('POST /api/generation/execution/start', () => {
    it('starts execution phase successfully', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValueOnce({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        prompt: 'Build a todo app',
        appType: 'web-app',
        status: 'pending',
        currentPhase: 'planning',
        phaseStatus: 'completed',
        filesPath: 'projects/user-1/123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(mockPrisma.specFile.findUnique)
        .mockResolvedValueOnce({
          id: 'spec-1',
          projectId: 'project-1',
          filename: 'architecture.md',
          content: '# Architecture',
          phase: 'discovery',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'spec-2',
          projectId: 'project-1',
          filename: 'plan.md',
          content: '# Plan',
          phase: 'planning',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      vi.mocked(mockProvider.chat)
        .mockResolvedValueOnce({
          content: JSON.stringify(['src/', 'public/']),
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            dependencies: { react: '^18.0.0' },
            devDependencies: { vitest: '^4.0.0' },
          }),
          usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
          finishReason: 'stop',
        });

      const response = await request(app)
        .post('/api/generation/execution/start')
        .send({ projectId: 'project-1' })
        .expect(200);

      expect(response.body).toMatchObject({
        phase: 'execution',
        status: 'completed',
      });
    });
  });

  describe('POST /api/generation/verification/start', () => {
    it('starts verification phase successfully', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValueOnce({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        prompt: 'Build a todo app',
        appType: 'web-app',
        status: 'pending',
        currentPhase: 'execution',
        phaseStatus: 'completed',
        filesPath: 'projects/user-1/123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(mockProvider.chat).mockResolvedValueOnce({
        content: JSON.stringify({
          overallStatus: 'passed',
          summary: 'All checks passed',
          failedStages: [],
          recommendations: [],
          criticalIssues: [],
        }),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        finishReason: 'stop',
      });

      const response = await request(app)
        .post('/api/generation/verification/start')
        .send({ projectId: 'project-1' })
        .expect(200);

      expect(response.body).toMatchObject({
        phase: 'verification',
        status: 'completed',
      });
      expect(mockPrisma.verificationLog.create).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles LLM provider errors gracefully', async () => {
      vi.mocked(mockProvider.chat).mockRejectedValueOnce(new Error('LLM API error'));

      const response = await request(app)
        .post('/api/generation/discovery/start')
        .send({ projectId: 'project-1' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('validates request body schema', async () => {
      await request(app)
        .post('/api/generation/discovery/start')
        .send({ invalidField: 'test' })
        .expect(400);
    });
  });
});
