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

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function validateUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export type UserWithSettings = Prisma.UserGetPayload<{ include: { settings: true } }>;

export async function getUserProfile(userId: string): Promise<UserWithSettings | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });
}
