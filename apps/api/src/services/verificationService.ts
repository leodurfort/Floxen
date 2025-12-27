import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { TokenType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/mailer';
import {
  getVerificationEmailHtml,
  getPasswordResetEmailHtml,
  getEmailChangeEmailHtml,
} from './emailTemplates';

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 10;
const SALT_ROUNDS = 10;

/**
 * Generate a random 6-digit code
 */
function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash a verification code before storing
 */
async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, SALT_ROUNDS);
}

/**
 * Verify a code against its hash
 */
async function verifyCodeHash(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Create a verification token and send email
 */
export async function createVerificationToken(
  email: string,
  type: TokenType,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Invalidate any existing tokens of the same type for this email
    await prisma.verificationToken.updateMany({
      where: {
        email: normalizedEmail,
        type,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used to invalidate
      },
    });

    // Generate new code
    const code = generateCode();
    const hashedCode = await hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    // Store token
    await prisma.verificationToken.create({
      data: {
        userId,
        email: normalizedEmail,
        code: hashedCode,
        type,
        expiresAt,
      },
    });

    // Send email based on type
    let subject: string;
    let html: string;

    switch (type) {
      case 'EMAIL_VERIFICATION':
        subject = 'Verify your ProductSynch email';
        html = getVerificationEmailHtml(code);
        break;
      case 'PASSWORD_RESET':
        subject = 'Reset your ProductSynch password';
        html = getPasswordResetEmailHtml(code);
        break;
      case 'EMAIL_CHANGE':
        subject = 'Confirm your new email address';
        html = getEmailChangeEmailHtml(code, normalizedEmail);
        break;
      default:
        throw new Error(`Unknown token type: ${type}`);
    }

    await sendEmail({
      to: normalizedEmail,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to create verification token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send verification email',
    };
  }
}

/**
 * Verify a code for a given email and type
 * @param consume - If true (default), marks the token as used. Set to false for intermediate verification.
 */
export async function verifyToken(
  email: string,
  code: string,
  type: TokenType,
  consume: boolean = true
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Find all unused, non-expired tokens for this email and type
    const tokens = await prisma.verificationToken.findMany({
      where: {
        email: normalizedEmail,
        type,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (tokens.length === 0) {
      return { valid: false, error: 'No valid verification code found. Please request a new one.' };
    }

    // Try to verify against the most recent token
    for (const token of tokens) {
      const isValid = await verifyCodeHash(code, token.code);
      if (isValid) {
        // Only mark token as used if consume is true
        if (consume) {
          await prisma.verificationToken.update({
            where: { id: token.id },
            data: { usedAt: new Date() },
          });
        }

        return { valid: true, userId: token.userId ?? undefined };
      }
    }

    return { valid: false, error: 'Invalid verification code.' };
  } catch (error) {
    console.error('Failed to verify token:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Check if an email can request a new verification code (rate limiting)
 * Returns remaining wait time in seconds if rate limited
 */
export async function checkRateLimit(
  email: string,
  type: TokenType
): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentTokens = await prisma.verificationToken.count({
    where: {
      email: normalizedEmail,
      type,
      createdAt: {
        gte: oneHourAgo,
      },
    },
  });

  // Allow 5 requests per hour
  if (recentTokens >= 5) {
    // Find the oldest token in the last hour to calculate wait time
    const oldestToken = await prisma.verificationToken.findFirst({
      where: {
        email: normalizedEmail,
        type,
        createdAt: {
          gte: oneHourAgo,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (oldestToken) {
      const waitUntil = new Date(oldestToken.createdAt.getTime() + 60 * 60 * 1000);
      const waitSeconds = Math.ceil((waitUntil.getTime() - Date.now()) / 1000);
      return { allowed: false, waitSeconds };
    }
  }

  return { allowed: true };
}

/**
 * Clean up expired tokens (can be called via cron job)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.verificationToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { not: null } },
      ],
    },
  });

  return result.count;
}

/**
 * Invalidate all tokens for a user (e.g., after password change)
 */
export async function invalidateUserTokens(userId: string, type?: TokenType): Promise<void> {
  await prisma.verificationToken.updateMany({
    where: {
      userId,
      usedAt: null,
      ...(type && { type }),
    },
    data: {
      usedAt: new Date(),
    },
  });
}
