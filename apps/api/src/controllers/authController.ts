import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { mockStore } from '../services/mockStore';
import { JwtUser } from '../middleware/auth';

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
    env.jwtSecret,
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
  const existing = mockStore.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const user = mockStore.createUser(email, password, name);
  const tokens = signTokens(user);
  return res.status(201).json({ user, tokens });
}

export function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, password } = parse.data;
  const user = mockStore.validateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const tokens = signTokens(user);
  return res.json({ user, tokens });
}

export function refresh(req: Request, res: Response) {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  try {
    const payload = jwt.verify(parse.data.refreshToken, env.jwtSecret) as JwtUser & { type?: string };
    if (payload.type !== 'refresh') throw new Error('Invalid token type');
    const user = mockStore.findUserByEmail(payload.email);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const tokens = signTokens(user);
    return res.json({ tokens });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export function me(req: Request, res: Response) {
  const userPayload = (req as Request & { user?: JwtUser }).user;
  if (!userPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = mockStore.findUserByEmail(userPayload.email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user });
}
