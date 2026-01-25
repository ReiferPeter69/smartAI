import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createProjectsRouter } from './projects';
import { PrismaClient } from '@prisma/client';

vi.mock('../middleware/auth', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { userId: 'user-1' };
    next();
  },
}));

describe('Projects API Routes - Integration Tests', () => {
  let app: Express;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = {
      project: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      specFile: {
        findUnique: vi.fn(),
      },
      verificationLog: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient;

    app = express();
    app.use(express.json());
    app.use('/api/projects', createProjectsRouter(mockPrisma));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message || 'Internal server error' });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/projects', () => {
    it('creates a new project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        description: 'A test project',
        prompt: 'Build a todo app with React',
        appType: 'web-app',
        userId: 'user-1',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'projects/user-1/123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.create).mockResolvedValue(mockProject);

      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          description: 'A test project',
          prompt: 'Build a todo app with React',
          appType: 'web-app',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'project-1',
        name: 'Test Project',
        prompt: 'Build a todo app with React',
        appType: 'web-app',
      });

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Project',
          description: 'A test project',
          prompt: 'Build a todo app with React',
          appType: 'web-app',
          userId: 'user-1',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
        }),
      });
    });

    it('validates required fields', async () => {
      await request(app)
        .post('/api/projects')
        .send({
          name: 'Test',
        })
        .expect(400);
    });

    it('validates appType enum', async () => {
      await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          prompt: 'Build something',
          appType: 'invalid-type',
        })
        .expect(400);
    });

    it('validates prompt minimum length', async () => {
      await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          prompt: 'short',
          appType: 'web-app',
        })
        .expect(400);
    });
  });

  describe('GET /api/projects', () => {
    it('retrieves all projects for authenticated user', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          description: null,
          prompt: 'Build app 1',
          appType: 'web-app',
          userId: 'user-1',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath: 'path1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project-2',
          name: 'Project 2',
          description: null,
          prompt: 'Build app 2',
          appType: 'api',
          userId: 'user-1',
          status: 'pending',
          currentPhase: 'planning',
          phaseStatus: 'in_progress',
          filesPath: 'path2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockPrisma.project.findMany).mockResolvedValue(mockProjects);

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('project-1');
      expect(response.body[1].id).toBe('project-2');
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('returns empty array when user has no projects', async () => {
      vi.mocked(mockPrisma.project.findMany).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/projects/:projectId', () => {
    it('retrieves a specific project with files', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        description: null,
        prompt: 'Build app',
        appType: 'web-app',
        userId: 'user-1',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
        specFiles: [
          {
            id: 'file-1',
            filename: 'architecture.md',
            content: '# Architecture',
            phase: 'discovery',
            projectId: 'project-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      const response = await request(app)
        .get('/api/projects/project-1')
        .expect(200);

      expect(response.body.id).toBe('project-1');
      expect(response.body.specFiles).toHaveLength(1);
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        include: { specFiles: true },
      });
    });

    it('returns 404 when project not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      await request(app)
        .get('/api/projects/nonexistent')
        .expect(404);
    });

    it('returns 403 when user does not own project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'other-user',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
        specFiles: [],
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      await request(app)
        .get('/api/projects/project-1')
        .expect(403);
    });
  });

  describe('PATCH /api/projects/:projectId', () => {
    it('updates project fields', async () => {
      const existingProject = {
        id: 'project-1',
        name: 'Old Name',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'user-1',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedProject = {
        ...existingProject,
        name: 'New Name',
        description: 'Updated description',
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(existingProject);
      vi.mocked(mockPrisma.project.update).mockResolvedValue(updatedProject);

      const response = await request(app)
        .patch('/api/projects/project-1')
        .send({
          name: 'New Name',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.name).toBe('New Name');
      expect(response.body.description).toBe('Updated description');
    });

    it('returns 404 when project not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      await request(app)
        .patch('/api/projects/nonexistent')
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('returns 403 when user does not own project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'other-user',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      await request(app)
        .patch('/api/projects/project-1')
        .send({ name: 'New Name' })
        .expect(403);
    });

    it('validates update schema', async () => {
      await request(app)
        .patch('/api/projects/project-1')
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    it('deletes a project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'user-1',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);
      vi.mocked(mockPrisma.project.delete).mockResolvedValue(mockProject);

      await request(app)
        .delete('/api/projects/project-1')
        .expect(204);

      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
    });

    it('returns 404 when project not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      await request(app)
        .delete('/api/projects/nonexistent')
        .expect(404);
    });

    it('returns 403 when user does not own project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'other-user',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      await request(app)
        .delete('/api/projects/project-1')
        .expect(403);
    });
  });

  describe('GET /api/projects/:projectId/files/:filename', () => {
    it('retrieves a spec file', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'user-1',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFile = { content: '# Architecture\n\n## Overview' };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);
      vi.mocked(mockPrisma.specFile.findUnique).mockResolvedValue(mockFile);

      const response = await request(app)
        .get('/api/projects/project-1/files/architecture.md')
        .expect(200);

      expect(response.body.content).toBe('# Architecture\n\n## Overview');
    });

    it('returns 404 when project not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      await request(app)
        .get('/api/projects/nonexistent/files/architecture.md')
        .expect(404);
    });

    it('returns 404 when file not found', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'user-1',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);
      vi.mocked(mockPrisma.specFile.findUnique).mockResolvedValue(null);

      await request(app)
        .get('/api/projects/project-1/files/nonexistent.md')
        .expect(404);
    });

    it('returns 403 when user does not own project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'other-user',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      await request(app)
        .get('/api/projects/project-1/files/architecture.md')
        .expect(403);
    });
  });

  describe('GET /api/projects/:projectId/verification-logs', () => {
    it('retrieves verification logs for a project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'user-1',
        status: 'pending',
        currentPhase: 'verification',
        phaseStatus: 'completed',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLogs = [
        {
          id: 'log-1',
          projectId: 'project-1',
          stage: 'tests',
          passed: true,
          output: 'All tests passed',
          error: null,
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          projectId: 'project-1',
          stage: 'build',
          passed: true,
          output: 'Build successful',
          error: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);
      vi.mocked(mockPrisma.verificationLog.findMany).mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/projects/project-1/verification-logs')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].stage).toBe('tests');
      expect(response.body[1].stage).toBe('build');
    });

    it('returns 404 when project not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      await request(app)
        .get('/api/projects/nonexistent/verification-logs')
        .expect(404);
    });

    it('returns 403 when user does not own project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'other-user',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      await request(app)
        .get('/api/projects/project-1/verification-logs')
        .expect(403);
    });
  });
});
