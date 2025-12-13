import dotenv from 'dotenv';

dotenv.config();

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3001),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
