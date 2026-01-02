import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
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

/**
 * Delete a single object from S3 storage
 */
export async function deleteFromStorage(key: string): Promise<boolean> {
  try {
    const client = createClient();
    if (!client) {
      logger.warn('Storage not configured, skipping delete', { key });
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
    });

    await client.send(command);

    logger.info('S3 delete completed', {
      bucket: env.s3.bucket,
      key,
    });

    return true;
  } catch (error) {
    logger.error('S3 delete failed', {
      error: error as Error,
      key,
      bucket: env.s3.bucket,
    });
    return false;
  }
}

/**
 * Delete all objects with a given prefix (e.g., all files for a shop)
 */
export async function deleteShopFiles(shopId: string): Promise<{ deleted: number; errors: number }> {
  const result = { deleted: 0, errors: 0 };

  try {
    const client = createClient();
    if (!client) {
      logger.warn('Storage not configured, skipping shop files cleanup', { shopId });
      return result;
    }

    // List all objects with the shop prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: env.s3.bucket,
      Prefix: `${shopId}/`,
    });

    const listResponse = await client.send(listCommand);
    const objects = listResponse.Contents || [];

    if (objects.length === 0) {
      logger.info('No S3 files found for shop', { shopId });
      return result;
    }

    logger.info('S3 cleanup: found files to delete', {
      shopId,
      fileCount: objects.length,
    });

    // Delete each object
    for (const obj of objects) {
      if (obj.Key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: env.s3.bucket,
          Key: obj.Key,
        });

        try {
          await client.send(deleteCommand);
          result.deleted++;
        } catch (deleteErr) {
          logger.error('S3 cleanup: failed to delete file', {
            error: deleteErr as Error,
            key: obj.Key,
            shopId,
          });
          result.errors++;
        }
      }
    }

    logger.info('S3 cleanup completed', {
      shopId,
      deleted: result.deleted,
      errors: result.errors,
    });

    return result;
  } catch (error) {
    logger.error('S3 cleanup failed', {
      error: error as Error,
      shopId,
      bucket: env.s3.bucket,
    });
    return result;
  }
}
