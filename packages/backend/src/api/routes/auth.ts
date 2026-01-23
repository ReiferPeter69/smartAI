import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { RegisterRequestSchema, LoginRequestSchema } from '@obsidian/core';
import { validate } from '../middleware/validation';
import { UserService } from '../../services/UserService';

export function createAuthRouter(prisma: PrismaClient): Router {
  const router = Router();
  const userService = new UserService(prisma);

  router.post(
    '/register',
    validate(RegisterRequestSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authResponse = await userService.register(req.body);
        res.status(201).json(authResponse);
      } catch (error) {
        if (error instanceof Error && error.message === 'User with this email already exists') {
          res.status(409).json({ error: error.message });
        } else {
          next(error);
        }
      }
    }
  );

  router.post(
    '/login',
    validate(LoginRequestSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authResponse = await userService.login(req.body);
        res.status(200).json(authResponse);
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid credentials') {
          res.status(401).json({ error: error.message });
        } else {
          next(error);
        }
      }
    }
  );

  return router;
}
