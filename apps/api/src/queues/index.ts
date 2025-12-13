import { createQueue } from '../lib/redis';

export const queues = {
  productSync: createQueue('product-sync'),
  aiEnrichment: createQueue('ai-enrichment'),
  feedGeneration: createQueue('feed-generation'),
  analytics: createQueue('analytics'),
  webhooks: createQueue('webhooks'),
};
