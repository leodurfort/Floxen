import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { toError } from '../utils/request';
import {
  findUserByEmail,
  findUserByGoogleId,
  createUserFromGoogle,
} from '../services/userService';
import { signTokens } from './authController';
import { sanitizeUser } from '../utils/user';

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

const client = new OAuth2Client(env.google.clientId);

async function verifyGoogleToken(credential: string): Promise<GoogleTokenPayload> {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: env.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new Error('Invalid Google token payload');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified ?? false,
    name: payload.name,
    given_name: payload.given_name,
    family_name: payload.family_name,
    picture: payload.picture,
  };
}

/**
 * Google OAuth Authentication
 * Handles both sign-in and sign-up flows
 */
export async function googleAuth(req: Request, res: Response) {
  const parse = googleAuthSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('googleAuth: invalid payload', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { credential } = parse.data;

  try {
    // 1. Verify the Google ID token
    const googlePayload = await verifyGoogleToken(credential);
    const { sub: googleId, email, given_name, family_name } = googlePayload;
    const normalizedEmail = email.toLowerCase();

    logger.info('googleAuth: token verified', { email: normalizedEmail, googleId });

    // 2. Check if user exists by Google ID (returning Google user)
    let user = await findUserByGoogleId(googleId);

    if (user) {
      // Existing Google user - sign them in
      const tokens = signTokens(user);
      logger.info('googleAuth: existing Google user signed in', { userId: user.id });
      return res.json({
        user: sanitizeUser(user),
        tokens,
        isNewUser: false,
      });
    }

    // 3. Check if user exists by email (potential collision)
    const existingEmailUser = await findUserByEmail(normalizedEmail);

    if (existingEmailUser) {
      // Email collision - user has an account with password
      if (existingEmailUser.authProvider === 'email' || existingEmailUser.passwordHash) {
        logger.warn('googleAuth: email collision', { email: normalizedEmail });
        return res.status(409).json({
          error: 'email_exists',
          message: 'An account with this email already exists. Please sign in with your password first, then link Google in settings.',
          redirectTo: '/login',
        });
      }
    }

    // 4. Create new user from Google OAuth
    user = await createUserFromGoogle({
      email: normalizedEmail,
      googleId,
      firstName: given_name,
      surname: family_name,
    });

    const tokens = signTokens(user);
    logger.info('googleAuth: new Google user created', { userId: user.id, email: normalizedEmail });

    return res.status(201).json({
      user: sanitizeUser(user),
      tokens,
      isNewUser: true,
    });
  } catch (err) {
    logger.error('googleAuth: error', { error: toError(err) });

    // Handle specific Google verification errors
    if (err instanceof Error && err.message.includes('Token used too late')) {
      return res.status(401).json({ error: 'Google token has expired. Please try again.' });
    }

    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
}
