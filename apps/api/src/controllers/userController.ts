import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { getUserId } from '../utils/request';
import {
  updateUserProfile,
  updateUserEmail,
  updateUserPassword,
  verifyPassword,
  findUserById,
} from '../services/userService';
import { createVerificationToken, verifyToken } from '../services/verificationService';

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  surname: z.string().min(1, 'Surname is required').optional(),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changeEmailVerifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Get current user profile
 */
export async function getProfile(req: Request, res: Response) {
  try {
    const user = await findUserById(getUserId(req));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      surname: user.surname,
      emailVerified: user.emailVerified,
      onboardingComplete: user.onboardingComplete,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt,
    });
  } catch (err) {
    logger.error('getProfile: error', { error: err instanceof Error ? err : new Error(String(err)) });
    return res.status(500).json({ error: 'Failed to get profile' });
  }
}

/**
 * Update user profile (firstName, surname)
 */
export async function updateProfile(req: Request, res: Response) {
  const parse = updateProfileSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { firstName, surname } = parse.data;

  try {
    const user = await updateUserProfile(getUserId(req), {
      firstName,
      surname,
    });

    logger.info('updateProfile: success', { userId: getUserId(req) });
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        surname: user.surname,
        emailVerified: user.emailVerified,
        onboardingComplete: user.onboardingComplete,
        subscriptionTier: user.subscriptionTier,
      },
    });
  } catch (err) {
    logger.error('updateProfile: error', { error: err instanceof Error ? err : new Error(String(err)) });
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

/**
 * Initiate email change - sends verification code to new email
 */
export async function changeEmail(req: Request, res: Response) {
  const parse = changeEmailSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { newEmail, password } = parse.data;
  const normalizedEmail = newEmail.toLowerCase().trim();

  try {
    const user = await findUserById(getUserId(req));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await verifyPassword(user.id, password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Check if email is already in use
    const { findUserByEmail } = await import('../services/userService');
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser && existingUser.id !== user.id) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    // Send verification code to new email
    const result = await createVerificationToken(normalizedEmail, 'EMAIL_CHANGE', user.id);
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send verification email' });
    }

    logger.info('changeEmail: verification sent', { userId: user.id, newEmail: normalizedEmail });
    return res.json({
      success: true,
      message: 'Verification code sent to your new email address',
    });
  } catch (err) {
    logger.error('changeEmail: error', { error: err instanceof Error ? err : new Error(String(err)) });
    return res.status(500).json({ error: 'Failed to initiate email change' });
  }
}

/**
 * Verify email change with code
 */
export async function changeEmailVerify(req: Request, res: Response) {
  const parse = changeEmailVerifySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { code } = parse.data;

  try {
    const user = await findUserById(getUserId(req));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the pending email change token for this user
    const { prisma } = await import('../lib/prisma');
    const pendingToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_CHANGE',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pendingToken) {
      return res.status(400).json({ error: 'No pending email change request found' });
    }

    // Verify the code
    const result = await verifyToken(pendingToken.email, code, 'EMAIL_CHANGE');
    if (!result.valid) {
      return res.status(400).json({ error: result.error || 'Invalid verification code' });
    }

    // Update the user's email
    const updatedUser = await updateUserEmail(user.id, pendingToken.email);

    logger.info('changeEmailVerify: success', { userId: user.id, newEmail: pendingToken.email });
    return res.json({
      success: true,
      message: 'Email updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        surname: updatedUser.surname,
        emailVerified: updatedUser.emailVerified,
        onboardingComplete: updatedUser.onboardingComplete,
        subscriptionTier: updatedUser.subscriptionTier,
      },
    });
  } catch (err) {
    logger.error('changeEmailVerify: error', { error: err instanceof Error ? err : new Error(String(err)) });
    return res.status(500).json({ error: 'Failed to verify email change' });
  }
}

/**
 * Change password
 */
export async function changePassword(req: Request, res: Response) {
  const parse = changePasswordSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { currentPassword, newPassword } = parse.data;

  try {
    const user = await findUserById(getUserId(req));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await verifyPassword(user.id, currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await updateUserPassword(user.id, newPassword);

    logger.info('changePassword: success', { userId: user.id });
    return res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (err) {
    logger.error('changePassword: error', { error: err instanceof Error ? err : new Error(String(err)) });
    return res.status(500).json({ error: 'Failed to change password' });
  }
}

/**
 * Delete account immediately (hard delete)
 */
export async function deleteAccount(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = user.email;

    // Import prisma for deletion
    const { prisma } = await import('../lib/prisma');

    // Delete user and all related data (Prisma cascade handles related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info('deleteAccount: success', { userId, email: userEmail });

    // Send confirmation email (after successful deletion)
    try {
      const { sendEmail } = await import('../lib/mailer');
      const { getAccountDeletedEmailHtml } = await import('../services/emailTemplates');

      await sendEmail({
        to: userEmail,
        subject: 'Account Deleted - ProductSynch',
        html: getAccountDeletedEmailHtml(),
      });
    } catch (emailErr) {
      // Log but don't fail the response - deletion was successful
      logger.error('deleteAccount: failed to send confirmation email', {
        error: emailErr instanceof Error ? emailErr : new Error(String(emailErr)),
        email: userEmail,
      });
    }

    return res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (err) {
    logger.error('deleteAccount: error', { error: err instanceof Error ? err : new Error(String(err)) });
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}
