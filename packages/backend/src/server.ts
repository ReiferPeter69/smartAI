import express, { Application } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createAuthRouter } from './api/routes/auth';
import { errorHandler, notFoundHandler } from './api/middleware/error-handler';

const PORT = process.env.PORT || 3001;

export function createApp(prisma: PrismaClient): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', createAuthRouter(prisma));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function startServer(app: Application): void {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  const prisma = new PrismaClient();
  const app = createApp(prisma);
  startServer(app);
}
