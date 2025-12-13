import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtUser {
  sub: string;
  email: string;
  tier?: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtUser;
    (req as Request & { user?: JwtUser }).user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
