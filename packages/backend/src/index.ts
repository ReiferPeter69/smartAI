import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createApp, startServer } from './server';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const app = createApp(prisma);

startServer(app);

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
