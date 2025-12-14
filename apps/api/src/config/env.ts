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
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  databasePublicUrl: process.env.DATABASE_PUBLIC_URL || '',
  redisUrl: process.env.REDIS_URL || '',
  redisPublicUrl: process.env.REDIS_PUBLIC_URL || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  qdrantUrl: process.env.QDRANT_URL || '',
  qdrantApiKey: process.env.QDRANT_API_KEY || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFrom: process.env.RESEND_FROM || '',
  wooRedirectUri: process.env.WOO_REDIRECT_URI || '',
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || '',
    endpoint: process.env.S3_ENDPOINT || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
