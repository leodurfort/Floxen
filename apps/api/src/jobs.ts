import { createQueue } from './lib/redis';

export const productSyncQueue = createQueue('product-sync');
export const aiEnrichmentQueue = createQueue('ai-enrichment');
export const feedGenerationQueue = createQueue('feed-generation');
export const analyticsQueue = createQueue('analytics');
export const webhooksQueue = createQueue('webhooks');
