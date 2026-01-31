import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ProjectService } from '../../services/ProjectService';
import { GenerationSessionService } from '../../services/GenerationSessionService';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';

const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    prompt: z.string().min(10),
    appType: z.enum(['web-app', 'api', 'mobile-app', 'cli', 'library']),
    startGeneration: z.boolean().optional().default(false),
  }),
});

const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    status: z.string().optional(),
  }),
});



export function createProjectsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const projectService = new ProjectService(prisma);
  const sessionService = new GenerationSessionService(prisma);

  router.post(
    '/',
    authenticate,
    validateRequest(createProjectSchema),
    async (req, res, next) => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const { name, description, prompt, appType, startGeneration } = req.body;
        const userId = req.user.userId;

        const project = await projectService.createProject({
          name,
          description,
          prompt,
          appType,
          userId,
        });

        if (startGeneration) {
          await sessionService.createSession({
            userId,
            projectId: project.id,
            prompt,
            appType,
          });
        }

        res.status(201).json(project);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get('/', authenticate, async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userId = req.user.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const appType = req.query.appType as string | undefined;
      const search = req.query.search as string | undefined;

      const offset = (page - 1) * limit;

      const result = await projectService.getUserProjectsWithPagination(userId, {
        limit,
        offset,
        status,
        appType,
        search,
      });

      res.json({
        data: result.projects,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId', authenticate, async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId as string;
      const project = await projectService.getProjectWithFiles(projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.userId !== req.user.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(project);
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    '/:projectId',
    authenticate,
    validateRequest(updateProjectSchema),
    async (req, res, next) => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const projectId = req.params.projectId as string;

        const existingProject = await projectService.getProject(projectId);
        if (!existingProject) {
          res.status(404).json({ error: 'Project not found' });
          return;
        }

        if (existingProject.userId !== req.user.userId) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        const updatedProject = await projectService.updateProject(projectId, req.body);

        res.json(updatedProject);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete('/:projectId', authenticate, async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId as string;

      const existingProject = await projectService.getProject(projectId);
      if (!existingProject) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (existingProject.userId !== req.user.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await projectService.deleteProject(projectId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/artifacts', authenticate, async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId as string;

      const project = await projectService.getProject(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.userId !== req.user.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const artifacts = await sessionService.getArtifacts(projectId);

      res.json(artifacts);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/files/:filename', authenticate, async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId as string;
      const filename = req.params.filename as string;

      const project = await projectService.getProject(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.userId !== req.user.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const file = await projectService.getSpecFile(projectId, filename);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      res.json(file);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/verification-logs', authenticate, async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId as string;

      const project = await projectService.getProject(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.userId !== req.user.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const logs = await projectService.getVerificationLogs(projectId);

      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
