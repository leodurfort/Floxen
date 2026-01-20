import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

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

export async function verifyUserEmail(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
}

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

export async function completeOnboarding(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { onboardingComplete: true },
  });
}

export async function updateUserEmail(userId: string, newEmail: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { email: newEmail.toLowerCase() },
  });
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user || !user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function findUserByGoogleId(googleId: string) {
  return prisma.user.findUnique({ where: { googleId } });
}

export async function createUserFromGoogle(payload: {
  email: string;
  googleId: string;
  firstName?: string;
  surname?: string;
}) {
  return prisma.user.create({
    data: {
      email: payload.email.toLowerCase(),
      googleId: payload.googleId,
      authProvider: 'google',
      passwordHash: null,
      firstName: payload.firstName,
      surname: payload.surname,
      name: payload.firstName && payload.surname
        ? `${payload.firstName} ${payload.surname}`
        : payload.firstName || payload.surname || null,
      emailVerified: true,
      onboardingComplete: false,
      subscriptionTier: 'FREE',
    },
  });
}
