import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { LLMConfigCreateSchema } from '@obsidian/core';
import { validate } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';
import { LLMConfigService } from '../../services/LLMConfigService';

export function createLLMConfigRouter(prisma: PrismaClient): Router {
  const router = Router();
  const llmConfigService = new LLMConfigService(prisma);

  router.use(authenticate);

  router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const configs = await llmConfigService.getConfigs(req.userId);
      res.json({ configs });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/',
    validate(LLMConfigCreateSchema),
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.userId) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        const config = await llmConfigService.createConfig(req.userId, req.body);
        res.status(201).json({ config });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Configuration for this provider and model already exists') {
            res.status(409).json({ error: error.message });
            return;
          }
        }
        next(error);
      }
    }
  );

  router.put('/:id/set-default', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const configId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await llmConfigService.setDefault(req.userId, configId);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Configuration not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message === 'Unauthorized') {
          res.status(403).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  });

  router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const configId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await llmConfigService.deleteConfig(req.userId, configId);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Configuration not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message === 'Unauthorized') {
          res.status(403).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  });

  return router;
}
