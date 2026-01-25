import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createEventsRouter } from './events';
import { PrismaClient } from '@prisma/client';
import { GenerationEventEmitter } from '../../websocket/EventEmitter';

vi.mock('../middleware/auth', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { userId: 'user-1' };
    next();
  },
}));

describe('Events API Routes - Integration Tests', () => {
  let app: Express;
  let mockPrisma: PrismaClient;
  let eventEmitter: GenerationEventEmitter;

  beforeEach(() => {
    mockPrisma = {
      project: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaClient;

    eventEmitter = GenerationEventEmitter.getInstance();
    eventEmitter.removeAllListeners();

    app = express();
    app.use(express.json());
    app.use('/api/events', createEventsRouter(mockPrisma));
  });

  afterEach(() => {
    eventEmitter.removeAllListeners();
  });

  describe('GET /api/events/stream/:projectId', () => {
    it('returns 404 when project does not exist', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue(null);

      await request(app).get('/api/events/stream/nonexistent').expect(404);

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });

    it('returns 403 when user does not own the project', async () => {
      vi.mocked(mockPrisma.project.findUnique).mockResolvedValue({
        id: 'project-1',
        userId: 'other-user',
        name: 'Test Project',
        prompt: 'Build app',
        appType: 'web-app',
        status: 'pending',
        currentPhase: 'discovery',
        phaseStatus: 'pending',
        filesPath: 'projects/other-user/123',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await request(app).get('/api/events/stream/project-1').expect(403);
    });
  });

  describe('event emitter integration', () => {
    it('emits events correctly through EventEmitter', () => {
      const callback = vi.fn();
      eventEmitter.subscribeToProject('project-1', callback);

      eventEmitter.emitPhaseUpdate({
        projectId: 'project-1',
        phase: 'discovery',
        status: 'in_progress',
        timestamp: Date.now(),
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          phase: 'discovery',
          status: 'in_progress',
        })
      );

      eventEmitter.unsubscribeFromProject('project-1', callback);
    });

    it('handles multiple events for the same project', () => {
      const callback = vi.fn();
      eventEmitter.subscribeToProject('project-2', callback);

      const events = [
        { projectId: 'project-2', phase: 'discovery' as const, status: 'in_progress', timestamp: Date.now() },
        { projectId: 'project-2', phase: 'discovery' as const, status: 'completed', timestamp: Date.now() },
        { projectId: 'project-2', phase: 'planning' as const, status: 'in_progress', timestamp: Date.now() },
      ];

      events.forEach((event) => eventEmitter.emitPhaseUpdate(event));

      expect(callback).toHaveBeenCalledTimes(3);
      eventEmitter.unsubscribeFromProject('project-2', callback);
    });
  });
});
