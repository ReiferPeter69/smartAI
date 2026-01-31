import express, { Application } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createAuthRouter } from './api/routes/auth';
import { createProjectsRouter } from './api/routes/projects';
import { createGenerationRouter } from './api/routes/generation';
import { createEventsRouter } from './api/routes/events';
import { createLLMConfigRouter } from './api/routes/llm-config';
import { createModelsRouter } from './api/routes/models';
import { createWorkflowsRouter } from './api/routes/workflows';
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
  app.use('/api/projects', createProjectsRouter(prisma));
  app.use('/api/generation', createGenerationRouter(prisma));
  app.use('/api/events', createEventsRouter(prisma));
  app.use('/api/llm-configs', createLLMConfigRouter(prisma));
  app.use('/api/models', createModelsRouter());
  app.use('/api/workflows', createWorkflowsRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function startServer(app: Application): void {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  const prisma = new PrismaClient();
  const app = createApp(prisma);
  startServer(app);
}
