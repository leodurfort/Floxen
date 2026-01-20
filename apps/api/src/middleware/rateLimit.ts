import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisConnection } from '../lib/redis';
import { logger } from '../lib/logger';

// Create Redis store if connection available
function createRedisStore(prefix: string) {
  if (!redisConnection) {
    logger.warn(`Redis not available for rate limiting (${prefix}), using memory store`);
    return undefined;
  }
  const redis = redisConnection;
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      const result = await redis.call(args[0], ...args.slice(1));
      return result as number | string;
    },
    prefix: `rl:${prefix}:`,
  });
}

const rateLimitResponse = {
  error: 'Too many requests',
  code: 'RATE_LIMITED',
};

/**
 * Auth rate limiter: 20 req/min per IP
 * Protects login, register, forgot-password from brute force
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  message: rateLimitResponse,
});

/**
 * Feed rate limiter: 100 req/min per IP
 * Protects public feed endpoints from abuse
 */
export const feedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('feed'),
  message: rateLimitResponse,
});

/**
 * Sync rate limiter: 5 req/min per shop
 * Protects expensive sync operations
 */
export const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('sync'),
  keyGenerator: (req) => req.params.id || 'unknown',
  message: rateLimitResponse,
});
