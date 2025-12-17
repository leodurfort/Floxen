import { createQueue } from './lib/redis';

// All jobs use the same 'sync' queue, differentiated by job name
// This matches the worker setup in workers/index.ts
export const productSyncQueue = createQueue('sync');
export const aiEnrichmentQueue = createQueue('sync');
export const feedGenerationQueue = createQueue('sync');
export const analyticsQueue = createQueue('sync');
export const webhooksQueue = createQueue('sync');
