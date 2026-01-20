import { Request } from 'express';
import { JwtUser } from '../middleware/auth';

/**
 * Extract user ID from an authenticated request.
 * Use only on routes protected by requireAuth middleware.
 */
export function getUserId(req: Request): string {
  const user = (req as Request & { user?: JwtUser }).user;
  return user?.sub || '';
}

/**
 * Extract full JWT user payload from an authenticated request.
 * Use only on routes protected by requireAuth middleware.
 */
export function getUser(req: Request): JwtUser | undefined {
  return (req as Request & { user?: JwtUser }).user;
}

/**
 * Normalize unknown error to Error instance for consistent logging.
 */
export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
