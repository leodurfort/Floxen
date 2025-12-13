import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { JwtUser } from '../middleware/auth';
import { createUser, findUserByEmail, validateUser } from '../services/userService';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

function signTokens(user: { id: string; email: string; subscriptionTier: string }) {
  const basePayload = { sub: user.id, email: user.email, tier: user.subscriptionTier };
  const accessToken = jwt.sign(
    { ...basePayload, type: 'access' },
    env.jwtSecret,
    { expiresIn: '15m' },
  );
  const refreshToken = jwt.sign(
    { ...basePayload, type: 'refresh', jti: crypto.randomUUID() },
    env.jwtRefreshSecret,
    { expiresIn: '7d' },
  );
  return { accessToken, refreshToken };
}

export function register(req: Request, res: Response) {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, password, name } = parse.data;
  findUserByEmail(email)
    .then((existing) => {
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return createUser({ email, password, name });
    })
    .then((user) => {
      if (!user) return;
      const tokens = signTokens(user);
      res.status(201).json({ user, tokens });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, password } = parse.data;
  validateUser(email, password)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const tokens = signTokens(user);
      return res.json({ user, tokens });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function refresh(req: Request, res: Response) {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  try {
    const payload = jwt.verify(parse.data.refreshToken, env.jwtRefreshSecret) as JwtUser & { type?: string };
    if (payload.type !== 'refresh') throw new Error('Invalid token type');
    findUserByEmail(payload.email).then((user) => {
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      const tokens = signTokens(user);
      return res.json({ tokens });
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export function me(req: Request, res: Response) {
  const userPayload = (req as Request & { user?: JwtUser }).user;
  if (!userPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  findUserByEmail(userPayload.email)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ user });
    })
    .catch(() => res.status(500).json({ error: 'Internal error' }));
}
