import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { JwtUser } from '../middleware/auth';
import { getUser } from '../utils/request';
import { createUser, findUserByEmail, validateUser } from '../services/userService';
import { logger } from '../lib/logger';

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

export async function register(req: Request, res: Response) {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('register: invalid payload', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, password, name } = parse.data;
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      logger.warn('register: email exists', { email });
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = await createUser({ email, password, name });
    const tokens = signTokens(user);
    logger.info('register: user created', { userId: user.id, email: user.email });
    res.status(201).json({ user, tokens });
  } catch (err: any) {
    logger.error('register: error', err);
    res.status(500).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('login: invalid payload', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, password } = parse.data;
  try {
    const user = await validateUser(email, password);
    if (!user) {
      logger.warn('login: invalid credentials', { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const tokens = signTokens(user);
    logger.info('login: success', { userId: user.id, email: user.email });
    return res.json({ user, tokens });
  } catch (err: any) {
    logger.error('login: error', err);
    res.status(500).json({ error: err.message });
  }
}

export async function refresh(req: Request, res: Response) {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('refresh: invalid payload', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }

  try {
    const payload = jwt.verify(parse.data.refreshToken, env.jwtRefreshSecret) as JwtUser & { type?: string };
    if (payload.type !== 'refresh') throw new Error('Invalid token type');
    const user = await findUserByEmail(payload.email);
    if (!user) {
      logger.warn('refresh: user not found', { email: payload.email });
      return res.status(401).json({ error: 'User not found' });
    }
    const tokens = signTokens(user);
    logger.info('refresh: success', { userId: user.id });
    return res.json({ tokens });
  } catch (err) {
    logger.error('refresh: error', { error: err instanceof Error ? err : new Error(String(err)) });
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function me(req: Request, res: Response) {
  const userPayload = getUser(req)!;

  try {
    const user = await findUserByEmail(userPayload.email);
    if (!user) {
      logger.warn('me: user not found', { email: userPayload.email });
      return res.status(404).json({ error: 'User not found' });
    }
    logger.info('me: fetched', { userId: user.id });
    return res.json({ user });
  } catch (err) {
    logger.error('me: error', { error: err instanceof Error ? err : new Error(String(err)) });
    res.status(500).json({ error: 'Internal error' });
  }
}
