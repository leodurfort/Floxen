import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getUserId, toError } from '../utils/request';

export async function getOverview(req: Request, res: Response) {
  const shopId = req.params.id;

  try {
    const totalProducts = await prisma.product.count({ where: { shopId } });

    return res.json({
      totalProducts,
    });
  } catch (err) {
    logger.error('Failed to get analytics overview', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
    });
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

const waitlistSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function signupWaitlist(req: Request, res: Response) {
  const parse = waitlistSignupSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { email } = parse.data;
  const normalizedEmail = email.toLowerCase().trim();
  const userId = getUserId(req);

  try {
    // Check if already signed up
    const existing = await prisma.analyticsWaitlist.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'You are already on the waitlist!',
        alreadySignedUp: true,
      });
    }

    // Create waitlist entry
    await prisma.analyticsWaitlist.create({
      data: {
        email: normalizedEmail,
        userId: userId || null,
      },
    });

    logger.info('Analytics waitlist signup', { userId, email: normalizedEmail });

    return res.json({
      success: true,
      message: 'You have been added to the analytics waitlist!',
      alreadySignedUp: false,
    });
  } catch (err) {
    // Handle unique constraint violation (race condition)
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return res.json({
        success: true,
        message: 'You are already on the waitlist!',
        alreadySignedUp: true,
      });
    }

    logger.error('Analytics waitlist signup failed', {
      error: toError(err),
      userId,
    });
    return res.status(500).json({ error: 'Failed to join waitlist' });
  }
}
