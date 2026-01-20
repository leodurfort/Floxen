import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { JwtUser } from '../middleware/auth';
import { getUser, toError } from '../utils/request';
import {
  createUserWithVerification,
  findUserByEmail,
  verifyUserEmail,
  updateUserProfile,
  verifyPassword,
} from '../services/userService';
import {
  createVerificationToken,
  verifyToken,
  checkRateLimit,
} from '../services/verificationService';
import { logger } from '../lib/logger';

// Helper to normalize email
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const registerStartSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const registerVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

const registerPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerCompleteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, 'First name is required'),
  surname: z.string().min(1, 'Surname is required'),
});

// Forgot password schemas
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const forgotPasswordResetSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  password: z.string().min(8),
});

export function signTokens(user: { id: string; email: string; subscriptionTier: string }) {
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

export async function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('login: invalid payload', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, password } = parse.data;
  try {
    // Check if user exists
    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn('login: user not found', { email });
      return res.status(401).json({ error: 'No account found with this email' });
    }

    // Check if user is Google-only (no password set)
    if (user.authProvider === 'google' && !user.passwordHash) {
      logger.warn('login: Google-only user attempted password login', { email });
      return res.status(401).json({
        error: 'google_account',
        message: 'This account uses Google Sign-In. Please sign in with Google.',
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(user.id, password);
    if (!isValidPassword) {
      logger.warn('login: incorrect password', { email });
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const tokens = signTokens(user);
    logger.info('login: success', { userId: user.id, email: user.email });
    return res.json({ user, tokens });
  } catch (err) {
    logger.error('login: error', { error: toError(err) });
    res.status(500).json({ error: toError(err).message });
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
    logger.error('refresh: error', { error: toError(err) });
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
    logger.error('me: error', { error: toError(err) });
    res.status(500).json({ error: 'Internal error' });
  }
}

// Multi-Step Registration Flow

export async function registerStart(req: Request, res: Response) {
  const parse = registerStartSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email } = parse.data;
  const normalizedEmail = normalizeEmail(email);

  try {
    // Check if email already exists
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      // If user exists and is verified, they should log in
      if (existing.emailVerified) {
        logger.warn('registerStart: email already registered', { email: normalizedEmail });
        return res.status(409).json({ error: 'This email is already registered. Please log in instead.' });
      }
      // If user exists but not verified, allow re-sending code
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(normalizedEmail, 'EMAIL_VERIFICATION');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: `Too many requests. Please try again in ${Math.ceil(rateLimit.waitSeconds! / 60)} minutes.`,
      });
    }

    // Send verification code
    const result = await createVerificationToken(normalizedEmail, 'EMAIL_VERIFICATION');
    if (!result.success) {
      logger.error('registerStart: failed to send verification', { error: toError(result.error || 'Unknown error') });
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }

    logger.info('registerStart: verification code sent', { email: normalizedEmail });
    return res.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (err) {
    logger.error('registerStart: error', { error: toError(err) });
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
}

/**
 * Step 2: Verify email with 6-digit code
 */
export async function registerVerify(req: Request, res: Response) {
  const parse = registerVerifySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, code } = parse.data;
  const normalizedEmail = normalizeEmail(email);

  try {
    const result = await verifyToken(normalizedEmail, code, 'EMAIL_VERIFICATION');
    if (!result.valid) {
      return res.status(400).json({ error: result.error || 'Invalid verification code.' });
    }

    logger.info('registerVerify: email verified', { email: normalizedEmail });
    return res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    logger.error('registerVerify: error', { error: toError(err) });
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}

/**
 * Resend verification code
 */
export async function registerResend(req: Request, res: Response) {
  const parse = registerStartSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email } = parse.data;
  const normalizedEmail = normalizeEmail(email);

  try {
    // Check rate limit (stricter for resend - 3 per hour)
    const rateLimit = await checkRateLimit(normalizedEmail, 'EMAIL_VERIFICATION');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: `Too many requests. Please try again in ${Math.ceil(rateLimit.waitSeconds! / 60)} minutes.`,
      });
    }

    const result = await createVerificationToken(normalizedEmail, 'EMAIL_VERIFICATION');
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to send verification email.' });
    }

    logger.info('registerResend: verification code resent', { email: normalizedEmail });
    return res.json({ success: true, message: 'Verification code resent.' });
  } catch (err) {
    logger.error('registerResend: error', { error: toError(err) });
    return res.status(500).json({ error: 'Failed to resend code. Please try again.' });
  }
}

/**
 * Step 3: Set password and create user account
 */
export async function registerPassword(req: Request, res: Response) {
  const parse = registerPasswordSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, password } = parse.data;
  const normalizedEmail = normalizeEmail(email);

  try {
    // Check if user already exists
    let user = await findUserByEmail(normalizedEmail);

    if (user) {
      if (user.emailVerified && user.onboardingComplete) {
        return res.status(409).json({ error: 'Account already exists. Please log in.' });
      }
      // User started registration but didn't complete - this is fine, they're continuing
    } else {
      // Create new user with password
      user = await createUserWithVerification({
        email: normalizedEmail,
        password,
      });
    }

    // Mark email as verified (they passed the code step)
    await verifyUserEmail(user.id);

    // Generate tokens so they can continue with profile setup
    const tokens = signTokens(user);

    logger.info('registerPassword: user created/updated', { userId: user.id, email: normalizedEmail });
    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true,
        onboardingComplete: false,
      },
      tokens,
    });
  } catch (err) {
    logger.error('registerPassword: error', { error: toError(err) });
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
}

/**
 * Step 4: Complete profile with first name and surname
 */
export async function registerComplete(req: Request, res: Response) {
  const parse = registerCompleteSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, firstName, surname } = parse.data;
  const normalizedEmail = normalizeEmail(email);

  try {
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please start registration again.' });
    }

    if (!user.emailVerified) {
      return res.status(400).json({ error: 'Please verify your email first.' });
    }

    // Update profile (onboarding completes after welcome page)
    const updatedUser = await updateUserProfile(user.id, { firstName, surname });

    // Generate fresh tokens with updated user data
    const tokens = signTokens(updatedUser);

    logger.info('registerComplete: profile completed', { userId: user.id });
    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        surname: updatedUser.surname,
        name: updatedUser.name,
        emailVerified: true,
        onboardingComplete: false, // Still false until welcome page
        subscriptionTier: updatedUser.subscriptionTier,
      },
      tokens,
    });
  } catch (err) {
    logger.error('registerComplete: error', { error: toError(err) });
    return res.status(500).json({ error: 'Failed to complete registration. Please try again.' });
  }
}

// Forgot Password Flow

export async function forgotPassword(req: Request, res: Response) {
  const parse = forgotPasswordSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email } = parse.data;
  const normalizedEmail = normalizeEmail(email);

  try {
    // Don't reveal if email exists or not
    const user = await findUserByEmail(normalizedEmail);

    if (user) {
      // Skip Google-only users - they don't have passwords to reset
      // Still return success to not reveal email exists
      if (user.authProvider === 'google' && !user.passwordHash) {
        logger.info('forgotPassword: skipped Google-only user (not revealed)', { email: normalizedEmail });
        return res.json({ success: true, message: 'If your email is registered, you will receive a reset code.' });
      }

      // Check rate limit
      const rateLimit = await checkRateLimit(normalizedEmail, 'PASSWORD_RESET');
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many requests. Please try again in ${Math.ceil(rateLimit.waitSeconds! / 60)} minutes.`,
        });
      }

      // Send reset code
      await createVerificationToken(normalizedEmail, 'PASSWORD_RESET', user.id);
      logger.info('forgotPassword: code sent', { email: normalizedEmail });
    } else {
      logger.info('forgotPassword: email not found (not revealed)', { email: normalizedEmail });
    }

    // Always return success to not reveal if email exists
    return res.json({ success: true, message: 'If your email is registered, you will receive a reset code.' });
  } catch (err) {
    logger.error('forgotPassword: error', { error: toError(err) });
    return res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
}

/**
 * Verify password reset code
 */
export async function forgotPasswordVerify(req: Request, res: Response) {
  const parse = forgotPasswordVerifySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, code } = parse.data;
  const normalizedEmail = normalizeEmail(email);

  try {
    // Just verify the code is valid, don't consume it yet (consume=false)
    const result = await verifyToken(normalizedEmail, code, 'PASSWORD_RESET', false);
    if (!result.valid) {
      return res.status(400).json({ error: result.error || 'Invalid or expired code.' });
    }

    logger.info('forgotPasswordVerify: code verified', { email: normalizedEmail });
    return res.json({ success: true, message: 'Code verified. You can now reset your password.' });
  } catch (err) {
    logger.error('forgotPasswordVerify: error', { error: toError(err) });
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}

/**
 * Reset password with code
 */
export async function forgotPasswordReset(req: Request, res: Response) {
  const parse = forgotPasswordResetSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email, code, password } = parse.data;
  const normalizedEmail = normalizeEmail(email);

  try {
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify and consume the reset code
    const result = await verifyToken(normalizedEmail, code, 'PASSWORD_RESET');
    if (!result.valid) {
      return res.status(400).json({ error: result.error || 'Invalid or expired code.' });
    }

    // Import and use updateUserPassword
    const { updateUserPassword } = await import('../services/userService');
    await updateUserPassword(user.id, password);

    // Generate new tokens
    const tokens = signTokens(user);

    logger.info('forgotPasswordReset: password reset', { userId: user.id });
    return res.json({
      success: true,
      message: 'Password reset successfully.',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        onboardingComplete: user.onboardingComplete,
      },
      tokens,
    });
  } catch (err) {
    logger.error('forgotPasswordReset: error', { error: toError(err) });
    return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
}
