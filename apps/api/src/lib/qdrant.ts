import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../config/env';

export function getQdrantClient() {
  if (!env.qdrantUrl) return null;
  return new QdrantClient({
    url: env.qdrantUrl,
    apiKey: env.qdrantApiKey || undefined,
  });
}
