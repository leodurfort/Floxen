import dotenv from 'dotenv';
import path from 'path';

// Load .env from monorepo root (use process.cwd() since we run from root)
dotenv.config({ path: path.join(process.cwd(), '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Validation helpers
function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requireEnv(key: string, description: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Description: ${description}\n` +
      `Please set this variable in your .env file or environment.`
    );
  }
  return value;
}

function requireEnvInProduction(key: string, description: string, devFallback?: string): string {
  const value = process.env[key];

  if (IS_PRODUCTION) {
    if (!value || value.trim() === '') {
      throw new Error(
        `Missing required environment variable in production: ${key}\n` +
        `Description: ${description}\n` +
        `This variable is critical for security in production.`
      );
    }
    return value;
  }

  // Development mode: use provided value or fallback
  return value || devFallback || '';
}

function validateEncryptionKey(key: string): string {
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY is required.\n' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes).\n' +
      `Current length: ${key.length}\n` +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      'ENCRYPTION_KEY must be a valid hex string (only 0-9 and a-f characters).\n' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return key;
}

function validateJwtSecret(secret: string, secretName: string): void {
  if (IS_PRODUCTION) {
    if (secret.length < 32) {
      throw new Error(
        `${secretName} must be at least 32 characters in production.\n` +
        `Current length: ${secret.length}\n` +
        'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    }

    // Prevent using the development defaults in production
    const insecureDefaults = ['dev-secret-change-me', 'dev-refresh-secret'];
    if (insecureDefaults.includes(secret)) {
      throw new Error(
        `${secretName} is using an insecure development default in production!\n` +
        'This is a critical security vulnerability.\n' +
        'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    }
  }
}

// Validate and export environment configuration
const jwtSecret = requireEnvInProduction(
  'JWT_SECRET',
  'Secret key for signing JWT access tokens',
  'dev-secret-change-me'
);

const jwtRefreshSecret = requireEnvInProduction(
  'JWT_REFRESH_SECRET',
  'Secret key for signing JWT refresh tokens',
  'dev-refresh-secret'
);

const encryptionKey = validateEncryptionKey(
  requireEnv('ENCRYPTION_KEY', 'AES-256-GCM encryption key (32-byte hex)')
);

// Validate JWT secrets
validateJwtSecret(jwtSecret, 'JWT_SECRET');
validateJwtSecret(jwtRefreshSecret, 'JWT_REFRESH_SECRET');

export const env = {
  nodeEnv: NODE_ENV,
  port: toNumber(process.env.PORT, 3001),
  jwtSecret,
  jwtRefreshSecret,
  encryptionKey,
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
  webBaseUrl: process.env.WEB_BASE_URL || '',
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || '',
    endpoint: process.env.S3_ENDPOINT || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    prices: {
      starterMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
      starterAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL || '',
      proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
      proAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
    },
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  scheduler: {
    enableScheduledSync: process.env.ENABLE_SCHEDULED_SYNC === 'true',
    syncIntervalMinutes: toNumber(process.env.SYNC_INTERVAL_MINUTES, 60),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
};
