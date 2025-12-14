import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const logLevel = env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'];

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: logLevel as any,
  });

if (env.nodeEnv !== 'production') {
  global.prisma = prisma;
}

if (env.nodeEnv === 'test') {
  logger.info('Prisma connection skipped in test environment');
} else {
  prisma.$connect().catch((err) => {
    logger.error('Failed to connect to database', err);
  });
}
