import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Adds a unique request ID to each request for tracing.
 * The ID is also returned in the X-Request-ID response header.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Use existing header if provided (e.g., from load balancer), otherwise generate
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
