import { PrismaClient, Project } from '@prisma/client';

export interface CreateProjectInput {
  name: string;
  description?: string;
  prompt: string;
  appType: string;
  userId: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: string;
  currentPhase?: string;
  phaseStatus?: string;
}

export interface ProjectFilters {
  limit?: number;
  offset?: number;
  status?: string;
  appType?: string;
  search?: string;
}

export class ProjectServiceError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ProjectServiceError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async createProject(input: CreateProjectInput): Promise<Project> {
    try {
      const filesPath = `projects/${input.userId}/${Date.now()}`;

      return await this.prisma.project.create({
        data: {
          name: input.name,
          description: input.description,
          prompt: input.prompt,
          appType: input.appType,
          userId: input.userId,
          status: 'pending',
          currentPhase: 'discovery',
          phaseStatus: 'pending',
          filesPath,
        },
      });
    } catch (error) {
      throw new ProjectServiceError(
        'Failed to create project',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    try {
      return await this.prisma.project.findUnique({
        where: { id: projectId },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to get project: ${projectId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getProjectWithFiles(projectId: string): Promise<Project & { specFiles: unknown[] } | null> {
    try {
      return await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { specFiles: true },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to get project with files: ${projectId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      return await this.prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to get projects for user: ${userId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getUserProjectsWithPagination(
    userId: string,
    filters?: ProjectFilters
  ): Promise<{ projects: Project[]; total: number }> {
    try {
      const where: Record<string, unknown> = { userId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.appType) {
        where.appType = filters.appType;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { prompt: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;

      const [projects, total] = await Promise.all([
        this.prisma.project.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.project.count({ where }),
      ]);

      return { projects, total };
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to get paginated projects for user: ${userId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
    try {
      return await this.prisma.project.update({
        where: { id: projectId },
        data: input,
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to update project: ${projectId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async updatePhaseStatus(
    projectId: string,
    phase: string,
    status: string
  ): Promise<Project> {
    try {
      return await this.prisma.project.update({
        where: { id: projectId },
        data: {
          currentPhase: phase,
          phaseStatus: status,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to update phase status for project: ${projectId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.prisma.project.delete({
        where: { id: projectId },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to delete project: ${projectId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async saveSpecFile(
    projectId: string,
    filename: string,
    content: string,
    phase: string
  ): Promise<void> {
    try {
      await this.prisma.specFile.upsert({
        where: {
          projectId_filename: {
            projectId,
            filename,
          },
        },
        update: { content },
        create: {
          projectId,
          filename,
          content,
          phase,
        },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to save spec file: ${filename}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getSpecFile(projectId: string, filename: string): Promise<{ content: string } | null> {
    try {
      const file = await this.prisma.specFile.findUnique({
        where: {
          projectId_filename: {
            projectId,
            filename,
          },
        },
        select: { content: true },
      });

      return file;
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to get spec file: ${filename}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async addVerificationLog(
    projectId: string,
    stage: string,
    passed: boolean,
    output: string,
    error?: string
  ): Promise<void> {
    try {
      await this.prisma.verificationLog.create({
        data: {
          projectId,
          stage,
          passed,
          output,
          error,
        },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to add verification log for project: ${projectId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getVerificationLogs(projectId: string): Promise<unknown[]> {
    try {
      return await this.prisma.verificationLog.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to get verification logs for project: ${projectId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async saveArtifact(
    projectId: string,
    phase: string,
    filename: string,
    content: string
  ): Promise<void> {
    try {
      await this.prisma.specFile.upsert({
        where: {
          projectId_filename: {
            projectId,
            filename,
          },
        },
        update: { content, phase },
        create: {
          projectId,
          filename,
          content,
          phase,
        },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to save artifact: ${filename} for phase: ${phase}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getArtifact(
    projectId: string,
    phase: string,
    filename: string
  ): Promise<{ content: string; phase: string } | null> {
    try {
      const file = await this.prisma.specFile.findFirst({
        where: {
          projectId,
          filename,
          phase,
        },
        select: { content: true, phase: true },
      });

      return file;
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to get artifact: ${filename} for phase: ${phase}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async listArtifacts(projectId: string): Promise<Array<{
    id: string;
    filename: string;
    phase: string;
    createdAt: Date;
  }>> {
    try {
      return await this.prisma.specFile.findMany({
        where: { projectId },
        select: {
          id: true,
          filename: true,
          phase: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new ProjectServiceError(
        `Failed to list artifacts for project: ${projectId}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}
