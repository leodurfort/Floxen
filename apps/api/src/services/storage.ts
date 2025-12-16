import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { logger } from '../lib/logger';

function createClient() {
  if (!env.s3.bucket || !env.s3.region || !env.s3.endpoint) {
    logger.warn('S3 storage not configured - missing required environment variables', {
      hasBucket: !!env.s3.bucket,
      hasRegion: !!env.s3.region,
      hasEndpoint: !!env.s3.endpoint,
    });
    return null;
  }
  return new S3Client({
    region: env.s3.region,
    endpoint: env.s3.endpoint,
    credentials: env.s3.accessKeyId && env.s3.secretAccessKey
      ? {
          accessKeyId: env.s3.accessKeyId,
          secretAccessKey: env.s3.secretAccessKey,
        }
      : undefined,
  });
}

export async function uploadJsonToStorage(key: string, body: string) {
  try {
    const client = createClient();
    if (!client) {
      const error = new Error('Storage not configured');
      logger.error('Failed to create S3 client', { error, key });
      throw error;
    }

    const command = new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
    });

    logger.info('S3 upload started', {
      bucket: env.s3.bucket,
      key,
      size: body.length,
    });

    await client.send(command);

    const endpoint = env.s3.endpoint.replace(/\/+$/, '');
    const url = `${endpoint}/${env.s3.bucket}/${key}`;

    logger.info('S3 upload completed', {
      bucket: env.s3.bucket,
      key,
      url,
    });

    return url;
  } catch (error) {
    logger.error('S3 upload failed', {
      error: error as Error,
      key,
      bucket: env.s3.bucket,
    });
    throw error;
  }
}
