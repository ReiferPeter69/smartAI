import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GenerationEventEmitter } from '../../websocket/EventEmitter';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { ProjectService } from '../../services/ProjectService';

export function createEventsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const projectService = new ProjectService(prisma);
  const eventEmitter = GenerationEventEmitter.getInstance();

  router.get('/stream/:projectId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    const projectId = req.params.projectId as string;
    const userId = req.user!.userId;

    try {
      const project = await projectService.getProject(projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      res.write('data: {"type":"connected"}\n\n');

      const handleUpdate = (event: {
        projectId: string;
        phase: string;
        status: string;
        data?: Record<string, unknown>;
        timestamp: number;
      }) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      eventEmitter.subscribeToProject(projectId, handleUpdate);

      const heartbeatInterval = setInterval(() => {
        res.write(': heartbeat\n\n');
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeatInterval);
        eventEmitter.unsubscribeFromProject(projectId, handleUpdate);
        res.end();
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to establish event stream' });
    }
  });

  return router;
}
