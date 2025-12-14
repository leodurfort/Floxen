import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

function createClient() {
  if (!env.s3.bucket || !env.s3.region || !env.s3.endpoint) return null;
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
  const client = createClient();
  if (!client) throw new Error('Storage not configured');
  const command = new PutObjectCommand({
    Bucket: env.s3.bucket,
    Key: key,
    Body: body,
    ContentType: 'application/json',
  });
  console.log('[storage] upload start', { bucket: env.s3.bucket, key, size: body.length });
  await client.send(command);
  const endpoint = env.s3.endpoint.replace(/\/+$/, '');
  console.log('[storage] upload complete', { bucket: env.s3.bucket, key });
  return `${endpoint}/${env.s3.bucket}/${key}`;
}
