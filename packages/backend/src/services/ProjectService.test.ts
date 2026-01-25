import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectService, ProjectServiceError } from './ProjectService';
import { PrismaClient } from '@prisma/client';

describe('ProjectService', () => {
  let projectService: ProjectService;
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
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      verificationLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient;

    projectService = new ProjectService(mockPrisma);
  });

  describe('createProject', () => {
    it('creates a new project with correct defaults', async () => {
      const input = {
        name: 'Test Project',
        description: 'A test project',
        prompt: 'Build a todo app',
        appType: 'web-app',
        userId: 'user-123',
      };

      const mockProject = {
        id: 'project-1',
        ...input,
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: expect.stringContaining('projects/user-123/'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.create).mockResolvedValue(mockProject);

      const result = await projectService.createProject(input);

      expect(result).toEqual(mockProject);
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Project',
          description: 'A test project',
          prompt: 'Build a todo app',
          appType: 'web-app',
          userId: 'user-123',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
        }),
      });
    });

    it('generates unique filesPath based on timestamp', async () => {
      const input = {
        name: 'Project 1',
        prompt: 'Test',
        appType: 'web-app',
        userId: 'user-123',
      };

      vi.mocked(mockPrisma.project.create).mockResolvedValue({
        id: 'project-1',
        name: 'Project 1',
        description: null,
        prompt: 'Test',
        appType: 'web-app',
        userId: 'user-123',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'projects/user-123/1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await projectService.createProject(input);

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          filesPath: expect.stringMatching(/^projects\/user-123\/\d+$/),
        }),
      });
    });

    it('throws ProjectServiceError on database error', async () => {
      const input = {
        name: 'Test',
        prompt: 'Test',
        appType: 'web-app',
        userId: 'user-123',
      };

      vi.mocked(mockPrisma.project.create).mockRejectedValue(new Error('DB Error'));

      await expect(projectService.createProject(input)).rejects.toThrow(ProjectServiceError);
      await expect(projectService.createProject(input)).rejects.toThrow('Failed to create project');
    });
  });

  describe('getProject', () => {
    it('retrieves a project by id', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        description: 'Description',
        prompt: 'Build app',
        appType: 'web-app',
        userId: 'user-123',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'projects/user-123/123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      const result = await projectService.getProject('project-1');

      expect(result).toEqual(mockProject);
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
    });

    it('returns null when project not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      const result = await projectService.getProject('nonexistent');

      expect(result).toBeNull();
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockRejectedValue(new Error('DB Error'));

      await expect(projectService.getProject('project-1')).rejects.toThrow(ProjectServiceError);
      await expect(projectService.getProject('project-1')).rejects.toThrow(
        'Failed to get project: project-1'
      );
    });
  });

  describe('getProjectWithFiles', () => {
    it('retrieves project with spec files', async () => {
      const mockProjectWithFiles = {
        id: 'project-1',
        name: 'Test Project',
        description: null,
        prompt: 'Build app',
        appType: 'web-app',
        userId: 'user-123',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'projects/user-123/123',
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

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProjectWithFiles);

      const result = await projectService.getProjectWithFiles('project-1');

      expect(result).toEqual(mockProjectWithFiles);
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        include: { specFiles: true },
      });
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockRejectedValue(new Error('DB Error'));

      await expect(projectService.getProjectWithFiles('project-1')).rejects.toThrow(
        ProjectServiceError
      );
    });
  });

  describe('getUserProjects', () => {
    it('retrieves all projects for a user ordered by updatedAt desc', async () => {
      const mockProjects = [
        {
          id: 'project-2',
          name: 'Newer Project',
          description: null,
          prompt: 'Build',
          appType: 'web-app',
          userId: 'user-123',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath: 'path',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 'project-1',
          name: 'Older Project',
          description: null,
          prompt: 'Build',
          appType: 'web-app',
          userId: 'user-123',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath: 'path',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      vi.mocked(mockPrisma.project.findMany).mockResolvedValue(mockProjects);

      const result = await projectService.getUserProjects('user-123');

      expect(result).toEqual(mockProjects);
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('returns empty array when user has no projects', async () => {
      vi.mocked(mockPrisma.project.findMany).mockResolvedValue([]);

      const result = await projectService.getUserProjects('user-123');

      expect(result).toEqual([]);
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.project.findMany).mockRejectedValue(new Error('DB Error'));

      await expect(projectService.getUserProjects('user-123')).rejects.toThrow(
        ProjectServiceError
      );
    });
  });

  describe('updateProject', () => {
    it('updates project with provided fields', async () => {
      const updateData = {
        name: 'Updated Name',
        status: 'in_progress',
      };

      const updatedProject = {
        id: 'project-1',
        name: 'Updated Name',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'user-123',
        status: 'in_progress',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.update).mockResolvedValue(updatedProject);

      const result = await projectService.updateProject('project-1', updateData);

      expect(result).toEqual(updatedProject);
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: updateData,
      });
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.project.update).mockRejectedValue(new Error('DB Error'));

      await expect(projectService.updateProject('project-1', { name: 'New' })).rejects.toThrow(
        ProjectServiceError
      );
    });
  });

  describe('updatePhaseStatus', () => {
    it('updates currentPhase and phaseStatus', async () => {
      const updatedProject = {
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'user-123',
        status: 'pending',
        currentPhase: 'planning',
        phaseStatus: 'in_progress',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.project.update).mockResolvedValue(updatedProject);

      const result = await projectService.updatePhaseStatus('project-1', 'planning', 'in_progress');

      expect(result).toEqual(updatedProject);
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: {
          currentPhase: 'planning',
          phaseStatus: 'in_progress',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.project.update).mockRejectedValue(new Error('DB Error'));

      await expect(
        projectService.updatePhaseStatus('project-1', 'planning', 'completed')
      ).rejects.toThrow(ProjectServiceError);
    });
  });

  describe('deleteProject', () => {
    it('deletes a project by id', async () => {
      vi.mocked(mockPrisma.project.delete).mockResolvedValue({
        id: 'project-1',
        name: 'Test',
        description: null,
        prompt: 'Build',
        appType: 'web-app',
        userId: 'user-123',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'path',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await projectService.deleteProject('project-1');

      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.project.delete).mockRejectedValue(new Error('DB Error'));

      await expect(projectService.deleteProject('project-1')).rejects.toThrow(ProjectServiceError);
    });
  });

  describe('saveSpecFile', () => {
    it('creates or updates a spec file', async () => {
      vi.mocked(mockPrisma.specFile.upsert).mockResolvedValue({
        id: 'file-1',
        projectId: 'project-1',
        filename: 'architecture.md',
        content: '# Architecture',
        phase: 'discovery',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await projectService.saveSpecFile('project-1', 'architecture.md', '# Architecture', 'discovery');

      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith({
        where: {
          projectId_filename: {
            projectId: 'project-1',
            filename: 'architecture.md',
          },
        },
        update: { content: '# Architecture' },
        create: {
          projectId: 'project-1',
          filename: 'architecture.md',
          content: '# Architecture',
          phase: 'discovery',
        },
      });
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.specFile.upsert).mockRejectedValue(new Error('DB Error'));

      await expect(
        projectService.saveSpecFile('project-1', 'architecture.md', 'content', 'discovery')
      ).rejects.toThrow(ProjectServiceError);
    });
  });

  describe('getSpecFile', () => {
    it('retrieves spec file content', async () => {
      const mockFile = { content: '# Architecture' };

      vi.mocked(mockPrisma.specFile.findUnique).mockResolvedValue(mockFile);

      const result = await projectService.getSpecFile('project-1', 'architecture.md');

      expect(result).toEqual(mockFile);
      expect(mockPrisma.specFile.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_filename: {
            projectId: 'project-1',
            filename: 'architecture.md',
          },
        },
        select: { content: true },
      });
    });

    it('returns null when file not found', async () => {
      vi.mocked(mockPrisma.specFile.findUnique).mockResolvedValue(null);

      const result = await projectService.getSpecFile('project-1', 'nonexistent.md');

      expect(result).toBeNull();
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.specFile.findUnique).mockRejectedValue(new Error('DB Error'));

      await expect(
        projectService.getSpecFile('project-1', 'architecture.md')
      ).rejects.toThrow(ProjectServiceError);
    });
  });

  describe('addVerificationLog', () => {
    it('creates a verification log entry', async () => {
      vi.mocked(mockPrisma.verificationLog.create).mockResolvedValue({
        id: 'log-1',
        projectId: 'project-1',
        stage: 'tests',
        passed: true,
        output: 'All tests passed',
        error: null,
        createdAt: new Date(),
      });

      await projectService.addVerificationLog(
        'project-1',
        'tests',
        true,
        'All tests passed'
      );

      expect(mockPrisma.verificationLog.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-1',
          stage: 'tests',
          passed: true,
          output: 'All tests passed',
          error: undefined,
        },
      });
    });

    it('includes error message when provided', async () => {
      vi.mocked(mockPrisma.verificationLog.create).mockResolvedValue({
        id: 'log-1',
        projectId: 'project-1',
        stage: 'build',
        passed: false,
        output: 'Build failed',
        error: 'Syntax error',
        createdAt: new Date(),
      });

      await projectService.addVerificationLog(
        'project-1',
        'build',
        false,
        'Build failed',
        'Syntax error'
      );

      expect(mockPrisma.verificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          error: 'Syntax error',
        }),
      });
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.verificationLog.create).mockRejectedValue(new Error('DB Error'));

      await expect(
        projectService.addVerificationLog('project-1', 'tests', true, 'output')
      ).rejects.toThrow(ProjectServiceError);
    });
  });

  describe('getVerificationLogs', () => {
    it('retrieves verification logs ordered by createdAt desc', async () => {
      const mockLogs = [
        {
          id: 'log-2',
          projectId: 'project-1',
          stage: 'lint',
          passed: true,
          output: 'Lint passed',
          error: null,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'log-1',
          projectId: 'project-1',
          stage: 'tests',
          passed: true,
          output: 'Tests passed',
          error: null,
          createdAt: new Date('2024-01-01'),
        },
      ];

      vi.mocked(mockPrisma.verificationLog.findMany).mockResolvedValue(mockLogs);

      const result = await projectService.getVerificationLogs('project-1');

      expect(result).toEqual(mockLogs);
      expect(mockPrisma.verificationLog.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns empty array when no logs exist', async () => {
      vi.mocked(mockPrisma.verificationLog.findMany).mockResolvedValue([]);

      const result = await projectService.getVerificationLogs('project-1');

      expect(result).toEqual([]);
    });

    it('throws ProjectServiceError on database error', async () => {
      vi.mocked(mockPrisma.verificationLog.findMany).mockRejectedValue(new Error('DB Error'));

      await expect(projectService.getVerificationLogs('project-1')).rejects.toThrow(
        ProjectServiceError
      );
    });
  });
});
