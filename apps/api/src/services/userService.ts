import bcrypt from 'bcryptjs';
import { Prisma, SubscriptionTier } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function createUser(payload: { email: string; password: string; name?: string; tier?: SubscriptionTier }) {
  const passwordHash = await bcrypt.hash(payload.password, 10);
  return prisma.user.create({
    data: {
      email: payload.email.toLowerCase(),
      passwordHash,
      name: payload.name,
      subscriptionTier: payload.tier ?? 'FREE',
    },
  });
}

/**
 * Create a user with email verification pending
 */
export async function createUserWithVerification(payload: {
  email: string;
  password: string;
  firstName?: string;
  surname?: string;
}) {
  const passwordHash = await bcrypt.hash(payload.password, 10);
  return prisma.user.create({
    data: {
      email: payload.email.toLowerCase(),
      passwordHash,
      firstName: payload.firstName,
      surname: payload.surname,
      emailVerified: false,
      onboardingComplete: false,
      subscriptionTier: 'FREE',
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function validateUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

/**
 * Mark user's email as verified
 */
export async function verifyUserEmail(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
}

/**
 * Update user profile (firstName, surname)
 */
export async function updateUserProfile(
  userId: string,
  data: { firstName?: string; surname?: string }
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      firstName: data.firstName,
      surname: data.surname,
      // Also update legacy name field for backward compatibility
      name: data.firstName && data.surname
        ? `${data.firstName} ${data.surname}`
        : data.firstName || data.surname || undefined,
    },
  });
}

/**
 * Mark user's onboarding as complete
 */
export async function completeOnboarding(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { onboardingComplete: true },
  });
}

/**
 * Update user's email (after verification)
 */
export async function updateUserEmail(userId: string, newEmail: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { email: newEmail.toLowerCase() },
  });
}

/**
 * Update user's password
 */
export async function updateUserPassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

/**
 * Verify current password matches
 */
export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export type UserWithSettings = Prisma.UserGetPayload<{ include: { settings: true } }>;

export async function getUserProfile(userId: string): Promise<UserWithSettings | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });
}
