import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GenerationSessionService, GenerationSessionServiceError } from './GenerationSessionService';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    rm: vi.fn(),
  },
}));

describe('GenerationSessionService', () => {
  let service: GenerationSessionService;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = {
      project: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      specFile: {
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient;

    service = new GenerationSessionService(mockPrisma, 'test-artifacts');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('creates a new session with correct defaults', async () => {
      const options = {
        userId: 'user-123',
        prompt: 'Build a todo app',
        appType: 'web-app',
        llmConfigId: 'config-1',
        timeout: 60000,
        maxRetries: 3,
      };

      const mockProject = {
        id: 'session-1',
        name: expect.stringContaining('Project'),
        prompt: 'Build a todo app',
        appType: 'web-app',
        userId: 'user-123',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: expect.stringContaining('test-artifacts/user-123'),
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
      };

      vi.mocked(mockPrisma.project.create).mockResolvedValue(mockProject);

      const result = await service.createSession(options);

      expect(result).toMatchObject({
        id: 'session-1',
        userId: 'user-123',
        projectId: 'session-1',
        prompt: 'Build a todo app',
        appType: 'web-app',
        currentPhase: {
          phase: 'discovery',
          status: 'pending',
          artifacts: {},
          errors: [],
          retryCount: 0,
        },
        config: {
          llmConfigId: 'config-1',
          timeout: 60000,
          maxRetries: 3,
        },
      });

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prompt: 'Build a todo app',
          appType: 'web-app',
          userId: 'user-123',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
        }),
      });
    });

    it('handles custom projectId if provided', async () => {
      const options = {
        userId: 'user-123',
        projectId: 'custom-project-id',
        prompt: 'Build a chat app',
        appType: 'web-app',
      };

      const mockProject = {
        id: 'session-1',
        name: 'Project',
        prompt: 'Build a chat app',
        appType: 'web-app',
        userId: 'user-123',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'test-artifacts/user-123/custom-project-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
      };

      vi.mocked(mockPrisma.project.create).mockResolvedValue(mockProject);

      await service.createSession(options);

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          filesPath: expect.stringContaining('custom-project-id'),
        }),
      });
    });

    it('throws error if project creation fails', async () => {
      const options = {
        userId: 'user-123',
        prompt: 'Test',
        appType: 'web-app',
      };

      vi.mocked(mockPrisma.project.create).mockRejectedValue(new Error('DB error'));

      await expect(service.createSession(options)).rejects.toThrow(
        GenerationSessionServiceError
      );
    });
  });

  describe('getSession', () => {
    it('returns session when authorized', async () => {
      const mockProject = {
        id: 'session-1',
        name: 'Project',
        prompt: 'Build app',
        appType: 'web-app',
        userId: 'user-123',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'test-artifacts/user-123/session-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        specFiles: [],
        verificationLogs: [],
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      const result = await service.getSession('session-1', 'user-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('session-1');
      expect(result?.userId).toBe('user-123');
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: { specFiles: true, verificationLogs: true },
      });
    });

    it('returns null when session not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      const result = await service.getSession('nonexistent', 'user-123');

      expect(result).toBeNull();
    });

    it('returns null when user unauthorized', async () => {
      const mockProject = {
        id: 'session-1',
        name: 'Project',
        prompt: 'Build app',
        appType: 'web-app',
        userId: 'user-456',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'test-artifacts/user-456/session-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        specFiles: [],
        verificationLogs: [],
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      const result = await service.getSession('session-1', 'user-123');

      expect(result).toBeNull();
    });

    it('includes specFiles in artifacts', async () => {
      const mockProject = {
        id: 'session-1',
        name: 'Project',
        prompt: 'Build app',
        appType: 'web-app',
        userId: 'user-123',
        status: 'pending',
        currentPhase: 'planning',
        phaseStatus: 'completed',
        filesPath: 'test-artifacts/user-123/session-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        specFiles: [
          { filename: 'architecture.md', content: '# Architecture' },
          { filename: 'plan.md', content: '# Plan' },
        ],
        verificationLogs: [],
      };

      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(mockProject);

      const result = await service.getSession('session-1', 'user-123');

      expect(result?.currentPhase.artifacts).toEqual({
        'architecture.md': '# Architecture',
        'plan.md': '# Plan',
      });
    });
  });

  describe('listSessions', () => {
    it('lists sessions with pagination', async () => {
      const mockProjects = [
        {
          id: 'session-1',
          name: 'Project 1',
          prompt: 'Build app 1',
          appType: 'web-app',
          userId: 'user-123',
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath: 'test-artifacts/user-123/session-1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          description: null,
          specFiles: [],
        },
        {
          id: 'session-2',
          name: 'Project 2',
          prompt: 'Build app 2',
          appType: 'web-app',
          userId: 'user-123',
          status: 'completed',
          currentPhase: 'verification',
          phaseStatus: 'completed',
          filesPath: 'test-artifacts/user-123/session-2',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          description: null,
          specFiles: [],
        },
      ];

      vi.mocked(mockPrisma.project.findMany).mockResolvedValue(mockProjects);
      vi.mocked(mockPrisma.project.count).mockResolvedValue(2);

      const result = await service.listSessions('user-123', { limit: 10, offset: 0 });

      expect(result.sessions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.sessions[0].id).toBe('session-1');
      expect(result.sessions[1].id).toBe('session-2');
    });

    it('filters by status', async () => {
      vi.mocked(mockPrisma.project.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.project.count).mockResolvedValue(0);

      await service.listSessions('user-123', { status: 'completed' });

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-123',
          status: 'completed',
        }),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: { specFiles: true },
      });
    });

    it('filters by date range', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      vi.mocked(mockPrisma.project.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.project.count).mockResolvedValue(0);

      await service.listSessions('user-123', { dateFrom, dateTo });

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-123',
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: { specFiles: true },
      });
    });

    it('applies default pagination when not provided', async () => {
      vi.mocked(mockPrisma.project.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.project.count).mockResolvedValue(0);

      await service.listSessions('user-123');

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      );
    });
  });

  describe('updateSession', () => {
    it('updates session when authorized', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue({
        id: 'session-1',
        userId: 'user-123',
      } as any);

      vi.mocked(mockPrisma.project.update).mockResolvedValue({} as any);

      await service.updateSession('session-1', 'user-123', {
        currentPhase: 'planning',
        phaseStatus: 'in_progress',
      });

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          currentPhase: 'planning',
          phaseStatus: 'in_progress',
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('throws error when session not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      await expect(
        service.updateSession('nonexistent', 'user-123', { status: 'completed' })
      ).rejects.toThrow(GenerationSessionServiceError);
    });

    it('throws error when user unauthorized', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue({
        id: 'session-1',
        userId: 'user-456',
      } as any);

      await expect(
        service.updateSession('session-1', 'user-123', { status: 'completed' })
      ).rejects.toThrow(GenerationSessionServiceError);
    });
  });

  describe('deleteSession', () => {
    it('deletes session and filesystem artifacts when authorized', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue({
        id: 'session-1',
        userId: 'user-123',
        filesPath: 'test-artifacts/user-123/session-1',
      } as any);

      vi.mocked(mockPrisma.project.delete).mockResolvedValue({} as any);
      vi.mocked(fs.rm).mockResolvedValue(undefined);

      await service.deleteSession('session-1', 'user-123');

      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(fs.rm).toHaveBeenCalled();
    });

    it('throws error when session not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      await expect(service.deleteSession('nonexistent', 'user-123')).rejects.toThrow(
        GenerationSessionServiceError
      );
    });

    it('throws error when user unauthorized', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue({
        id: 'session-1',
        userId: 'user-456',
        filesPath: 'test-artifacts/user-456/session-1',
      } as any);

      await expect(service.deleteSession('session-1', 'user-123')).rejects.toThrow(
        GenerationSessionServiceError
      );
    });

    it('continues if filesystem deletion fails', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue({
        id: 'session-1',
        userId: 'user-123',
        filesPath: 'test-artifacts/user-123/session-1',
      } as any);

      vi.mocked(mockPrisma.project.delete).mockResolvedValue({} as any);
      vi.mocked(fs.rm).mockRejectedValue(new Error('FS error'));

      await expect(service.deleteSession('session-1', 'user-123')).resolves.not.toThrow();

      expect(mockPrisma.project.delete).toHaveBeenCalled();
    });
  });

  describe('storeArtifact', () => {
    it('stores artifact in database and filesystem', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue({
        id: 'session-1',
        userId: 'user-123',
        filesPath: 'test-artifacts/user-123/session-1',
      } as any);

      vi.mocked(mockPrisma.specFile.upsert).mockResolvedValue({} as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.storeArtifact('session-1', 'discovery', 'architecture.md', '# Architecture');

      expect(mockPrisma.specFile.upsert).toHaveBeenCalledWith({
        where: {
          projectId_filename: {
            projectId: 'session-1',
            filename: 'architecture.md',
          },
        },
        update: { content: '# Architecture' },
        create: {
          projectId: 'session-1',
          filename: 'architecture.md',
          content: '# Architecture',
          phase: 'discovery',
        },
      });

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('architecture.md'),
        '# Architecture',
        'utf-8'
      );
    });

    it('throws error when session not found', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      await expect(
        service.storeArtifact('nonexistent', 'discovery', 'architecture.md', '# Architecture')
      ).rejects.toThrow(GenerationSessionServiceError);
    });

    it('creates directory if it does not exist', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue({
        id: 'session-1',
        userId: 'user-123',
        filesPath: 'test-artifacts/user-123/session-1',
      } as any);

      vi.mocked(mockPrisma.specFile.upsert).mockResolvedValue({} as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.storeArtifact('session-1', 'planning', 'plan.md', '# Plan');

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });
  });

  describe('getArtifacts', () => {
    it('retrieves all artifacts grouped by phase', async () => {
      const mockSpecFiles = [
        {
          id: '1',
          projectId: 'session-1',
          filename: 'architecture.md',
          content: '# Architecture',
          phase: 'discovery',
          createdAt: new Date(),
        },
        {
          id: '2',
          projectId: 'session-1',
          filename: 'plan.md',
          content: '# Plan',
          phase: 'planning',
          createdAt: new Date(),
        },
        {
          id: '3',
          projectId: 'session-1',
          filename: 'requirements.md',
          content: '# Requirements',
          phase: 'discovery',
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockPrisma.specFile.findMany).mockResolvedValue(mockSpecFiles);

      const result = await service.getArtifacts('session-1');

      expect(result).toEqual({
        discovery: {
          'architecture.md': '# Architecture',
          'requirements.md': '# Requirements',
        },
        planning: {
          'plan.md': '# Plan',
        },
      });

      expect(mockPrisma.specFile.findMany).toHaveBeenCalledWith({
        where: { projectId: 'session-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('returns empty object when no artifacts found', async () => {
      vi.mocked(mockPrisma.specFile.findMany).mockResolvedValue([]);

      const result = await service.getArtifacts('session-1');

      expect(result).toEqual({});
    });

    it('throws error if database query fails', async () => {
      vi.mocked(mockPrisma.specFile.findMany).mockRejectedValue(new Error('DB error'));

      await expect(service.getArtifacts('session-1')).rejects.toThrow(
        GenerationSessionServiceError
      );
    });
  });
});
