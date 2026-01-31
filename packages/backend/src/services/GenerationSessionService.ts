import { PrismaClient, Project } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { GenerationSession, Phase, PhaseContext } from '@obsidian/core';

export interface CreateSessionOptions {
  userId: string;
  projectId?: string;
  prompt: string;
  appType: string;
  llmConfigId?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface SessionFilters {
  status?: 'pending' | 'generating' | 'completed' | 'failed';
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface SessionUpdates {
  currentPhase?: string;
  phaseStatus?: string;
  status?: string;
}

export class GenerationSessionServiceError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'GenerationSessionServiceError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class GenerationSessionService {
  private readonly artifactsBasePath: string;

  constructor(
    private prisma: PrismaClient,
    artifactsBasePath = 'generated-projects'
  ) {
    this.artifactsBasePath = artifactsBasePath;
  }

  async createSession(options: CreateSessionOptions): Promise<GenerationSession> {
    try {
      const projectId = options.projectId || `proj_${Date.now()}`;
      const filesPath = `${this.artifactsBasePath}/${options.userId}/${projectId}`;

      const project = await this.prisma.project.create({
        data: {
          name: `Project ${new Date().toISOString()}`,
          prompt: options.prompt,
          appType: options.appType,
          userId: options.userId,
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath,
        },
      });

      return this.projectToSession(project, options);
    } catch (error) {
      throw new GenerationSessionServiceError(
        'Failed to create session',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getSession(sessionId: string, userId: string): Promise<GenerationSession | null> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: sessionId },
        include: { 
          specFiles: true,
          verificationLogs: true
        },
      });

      if (!project || project.userId !== userId) {
        return null;
      }

      return this.projectToSession(project);
    } catch (error) {
      throw new GenerationSessionServiceError(
        `Failed to get session: ${sessionId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async listSessions(
    userId: string,
    filters?: SessionFilters
  ): Promise<{ sessions: GenerationSession[]; total: number }> {
    try {
      const where: Record<string, unknown> = { userId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          (where.createdAt as Record<string, unknown>).gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          (where.createdAt as Record<string, unknown>).lte = filters.dateTo;
        }
      }

      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;

      const [projects, total] = await Promise.all([
        this.prisma.project.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: { specFiles: true },
        }),
        this.prisma.project.count({ where }),
      ]);

      const sessions = projects.map(p => this.projectToSession(p));

      return { sessions, total };
    } catch (error) {
      throw new GenerationSessionServiceError(
        `Failed to list sessions for user: ${userId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async updateSession(
    sessionId: string,
    userId: string,
    updates: SessionUpdates
  ): Promise<void> {
    try {
      const existing = await this.prisma.project.findUnique({
        where: { id: sessionId },
        select: { userId: true },
      });

      if (!existing || existing.userId !== userId) {
        throw new GenerationSessionServiceError('Session not found or unauthorized');
      }

      await this.prisma.project.update({
        where: { id: sessionId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw new GenerationSessionServiceError(
        `Failed to update session: ${sessionId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: sessionId },
        select: { userId: true, filesPath: true },
      });

      if (!project || project.userId !== userId) {
        throw new GenerationSessionServiceError('Session not found or unauthorized');
      }

      await this.prisma.project.delete({
        where: { id: sessionId },
      });

      try {
        const fullPath = path.resolve(project.filesPath);
        await fs.rm(fullPath, { recursive: true, force: true });
      } catch (fsError) {
        console.warn(`Failed to delete filesystem artifacts: ${fsError}`);
      }
    } catch (error) {
      throw new GenerationSessionServiceError(
        `Failed to delete session: ${sessionId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async storeArtifact(
    sessionId: string,
    phase: Phase,
    filename: string,
    content: string
  ): Promise<void> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: sessionId },
        select: { id: true, filesPath: true, userId: true },
      });

      if (!project) {
        throw new GenerationSessionServiceError('Session not found');
      }

      await this.prisma.specFile.upsert({
        where: {
          projectId_filename: {
            projectId: sessionId,
            filename,
          },
        },
        update: { content },
        create: {
          projectId: sessionId,
          filename,
          content,
          phase,
        },
      });

      const fullPath = path.resolve(project.filesPath);
      await fs.mkdir(fullPath, { recursive: true });
      await fs.writeFile(path.join(fullPath, filename), content, 'utf-8');
    } catch (error) {
      throw new GenerationSessionServiceError(
        `Failed to store artifact: ${filename}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getArtifacts(sessionId: string): Promise<Record<Phase, Record<string, string>>> {
    try {
      const specFiles = await this.prisma.specFile.findMany({
        where: { projectId: sessionId },
        orderBy: { createdAt: 'asc' },
      });

      const result: Record<string, Record<string, string>> = {};

      for (const file of specFiles) {
        if (!result[file.phase]) {
          result[file.phase] = {};
        }
        result[file.phase][file.filename] = file.content;
      }

      return result as Record<Phase, Record<string, string>>;
    } catch (error) {
      throw new GenerationSessionServiceError(
        `Failed to get artifacts for session: ${sessionId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private projectToSession(
    project: Project & { specFiles?: unknown[] },
    options?: CreateSessionOptions
  ): GenerationSession {
    const artifacts: Record<string, string> = {};
    
    if (project.specFiles) {
      for (const file of project.specFiles as Array<{ filename: string; content: string }>) {
        artifacts[file.filename] = file.content;
      }
    }

    const currentPhase: PhaseContext = {
      phase: project.currentPhase as Phase,
      status: project.phaseStatus as 'pending' | 'in_progress' | 'completed' | 'failed',
      artifacts,
      errors: [],
      retryCount: 0,
    };

    return {
      id: project.id,
      userId: project.userId,
      projectId: project.id,
      prompt: project.prompt,
      appType: project.appType,
      currentPhase,
      history: [],
      config: {
        llmConfigId: options?.llmConfigId,
        timeout: options?.timeout,
        maxRetries: options?.maxRetries || 3,
      },
      createdAt: project.createdAt.getTime(),
      updatedAt: project.updatedAt.getTime(),
    };
  }
}
