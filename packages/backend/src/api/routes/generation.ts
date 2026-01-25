import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import type { GenerationSession } from '@obsidian/core';
import { GenerationService } from '../../services/GenerationService';
import { ProjectService } from '../../services/ProjectService';
import { ProviderFactory } from '../../llm/ProviderFactory';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';

const startDiscoverySchema = z.object({
  body: z.object({
    projectId: z.string(),
    llmConfigId: z.string().optional(),
  }),
});

const submitAnswersSchema = z.object({
  body: z.object({
    projectId: z.string(),
    answers: z.record(z.string(), z.string()),
  }),
});

const startPhaseSchema = z.object({
  body: z.object({
    projectId: z.string(),
  }),
});

export function createGenerationRouter(prisma: PrismaClient): Router {
  const router = Router();
  const projectService = new ProjectService(prisma);

  router.post(
    '/discovery/start',
    authenticate,
    validateRequest(startDiscoverySchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const { projectId, llmConfigId } = req.body;
        const userId = req.user.userId;

        const project = await projectService.getProject(projectId);
        if (!project) {
          res.status(404).json({ error: 'Project not found' });
          return;
        }

        if (project.userId !== userId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        let llmConfig = await prisma.lLMConfig.findFirst({
          where: llmConfigId ? { id: llmConfigId } : { userId, isDefault: true },
        });

        if (!llmConfig) {
          llmConfig = await prisma.lLMConfig.findFirst({
            where: { userId },
          });
        }

        if (!llmConfig) {
          res.status(400).json({ error: 'No LLM configuration found' });
          return;
        }

        const provider = await ProviderFactory.createProvider({
          provider: llmConfig.provider as 'openai' | 'anthropic' | 'ollama',
          model: llmConfig.model,
          apiKey: llmConfig.apiKey || undefined,
          endpoint: llmConfig.endpoint || undefined,
        });

        const session: GenerationSession = {
          id: `session-${Date.now()}`,
          userId,
          projectId,
          prompt: project.prompt,
          appType: project.appType,
          currentPhase: {
            phase: 'discovery',
            status: 'pending',
            artifacts: {},
            errors: [],
            retryCount: 0,
          },
          history: [],
          config: {
            llmConfigId: llmConfig.id,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const generationService = new GenerationService(session, provider, projectService);

        const questions = await generationService.startDiscovery();

        res.json({
          sessionId: session.id,
          questions,
          phase: 'discovery',
          status: 'awaiting_answers',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/discovery/submit-answers',
    authenticate,
    validateRequest(submitAnswersSchema),
    async (req, res, next) => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const { projectId, answers } = req.body;
        const userId = req.user.userId;

        const project = await projectService.getProject(projectId);
        if (!project) {
          res.status(404).json({ error: 'Project not found' });
          return;
        }

        if (project.userId !== userId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        const llmConfig = await prisma.lLMConfig.findFirst({
          where: { userId, isDefault: true },
        });

        if (!llmConfig) {
          res.status(400).json({ error: 'No LLM configuration found' });
          return;
        }

        const provider = await ProviderFactory.createProvider({
          provider: llmConfig.provider as 'openai' | 'anthropic' | 'ollama',
          model: llmConfig.model,
          apiKey: llmConfig.apiKey || undefined,
          endpoint: llmConfig.endpoint || undefined,
        });

        const session: GenerationSession = {
          id: `session-${Date.now()}`,
          userId,
          projectId,
          prompt: project.prompt,
          appType: project.appType,
          currentPhase: {
            phase: 'discovery',
            status: 'in_progress',
            artifacts: {},
            errors: [],
            retryCount: 0,
          },
          history: [],
          config: {
            llmConfigId: llmConfig.id,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const generationService = new GenerationService(session, provider, projectService);

        await generationService.completeDiscoveryWithAnswers(answers);

        res.json({
          message: 'Discovery phase completed',
          phase: 'discovery',
          status: 'completed',
          nextPhase: 'planning',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/planning/start',
    authenticate,
    validateRequest(startPhaseSchema),
    async (req, res, next) => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const { projectId } = req.body;
        const userId = req.user.userId;

        const project = await projectService.getProject(projectId);
        if (!project) {
          res.status(404).json({ error: 'Project not found' });
          return;
        }

        if (project.userId !== userId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        if (project.currentPhase !== 'discovery' || project.phaseStatus !== 'completed') {
          res.status(400).json({ error: 'Discovery phase must be completed first' });
          return;
        }

        const llmConfig = await prisma.lLMConfig.findFirst({
          where: { userId, isDefault: true },
        });

        if (!llmConfig) {
          res.status(400).json({ error: 'No LLM configuration found' });
          return;
        }

        const provider = await ProviderFactory.createProvider({
          provider: llmConfig.provider as 'openai' | 'anthropic' | 'ollama',
          model: llmConfig.model,
          apiKey: llmConfig.apiKey || undefined,
          endpoint: llmConfig.endpoint || undefined,
        });

        const session: GenerationSession = {
          id: `session-${Date.now()}`,
          userId,
          projectId,
          prompt: project.prompt,
          appType: project.appType,
          currentPhase: {
            phase: 'discovery',
            status: 'completed',
            artifacts: {},
            errors: [],
            retryCount: 0,
          },
          history: [],
          config: {
            llmConfigId: llmConfig.id,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const generationService = new GenerationService(session, provider, projectService);

        await generationService.startPlanning();

        res.json({
          message: 'Planning phase completed',
          phase: 'planning',
          status: 'completed',
          nextPhase: 'execution',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/execution/start',
    authenticate,
    validateRequest(startPhaseSchema),
    async (req, res, next) => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const { projectId } = req.body;
        const userId = req.user.userId;

        const project = await projectService.getProject(projectId);
        if (!project) {
          res.status(404).json({ error: 'Project not found' });
          return;
        }

        if (project.userId !== userId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        if (project.currentPhase !== 'planning' || project.phaseStatus !== 'completed') {
          res.status(400).json({ error: 'Planning phase must be completed first' });
          return;
        }

        const llmConfig = await prisma.lLMConfig.findFirst({
          where: { userId, isDefault: true },
        });

        if (!llmConfig) {
          res.status(400).json({ error: 'No LLM configuration found' });
          return;
        }

        const provider = await ProviderFactory.createProvider({
          provider: llmConfig.provider as 'openai' | 'anthropic' | 'ollama',
          model: llmConfig.model,
          apiKey: llmConfig.apiKey || undefined,
          endpoint: llmConfig.endpoint || undefined,
        });

        const session: GenerationSession = {
          id: `session-${Date.now()}`,
          userId,
          projectId,
          prompt: project.prompt,
          appType: project.appType,
          currentPhase: {
            phase: 'planning',
            status: 'completed',
            artifacts: {},
            errors: [],
            retryCount: 0,
          },
          history: [
            {
              phase: 'discovery',
              status: 'completed',
              artifacts: {},
              errors: [],
              retryCount: 0,
            },
          ],
          config: {
            llmConfigId: llmConfig.id,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const generationService = new GenerationService(session, provider, projectService);

        await generationService.startExecution();

        res.json({
          message: 'Execution phase completed',
          phase: 'execution',
          status: 'completed',
          nextPhase: 'verification',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/verification/start',
    authenticate,
    validateRequest(startPhaseSchema),
    async (req, res, next) => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const { projectId } = req.body;
        const userId = req.user.userId;

        const project = await projectService.getProject(projectId);
        if (!project) {
          res.status(404).json({ error: 'Project not found' });
          return;
        }

        if (project.userId !== userId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        if (project.currentPhase !== 'execution' || project.phaseStatus !== 'completed') {
          res.status(400).json({ error: 'Execution phase must be completed first' });
          return;
        }

        const llmConfig = await prisma.lLMConfig.findFirst({
          where: { userId, isDefault: true },
        });

        if (!llmConfig) {
          res.status(400).json({ error: 'No LLM configuration found' });
          return;
        }

        const provider = await ProviderFactory.createProvider({
          provider: llmConfig.provider as 'openai' | 'anthropic' | 'ollama',
          model: llmConfig.model,
          apiKey: llmConfig.apiKey || undefined,
          endpoint: llmConfig.endpoint || undefined,
        });

        const session: GenerationSession = {
          id: `session-${Date.now()}`,
          userId,
          projectId,
          prompt: project.prompt,
          appType: project.appType,
          currentPhase: {
            phase: 'execution',
            status: 'completed',
            artifacts: {},
            errors: [],
            retryCount: 0,
          },
          history: [
            {
              phase: 'discovery',
              status: 'completed',
              artifacts: {},
              errors: [],
              retryCount: 0,
            },
            {
              phase: 'planning',
              status: 'completed',
              artifacts: {},
              errors: [],
              retryCount: 0,
            },
          ],
          config: {
            llmConfigId: llmConfig.id,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const generationService = new GenerationService(session, provider, projectService);

        await generationService.startVerification();

        res.json({
          message: 'Verification phase completed',
          phase: 'verification',
          status: 'completed',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
