import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(400).json({ error: 'Invalid request data' });
      }
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(400).json({ error: 'Invalid query parameters' });
      }
    }
  };
};
