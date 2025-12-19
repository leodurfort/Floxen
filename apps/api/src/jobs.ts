import { createQueue } from './lib/redis';

// Single queue for all jobs, differentiated by job name
// This matches the worker setup in workers/index.ts
export const syncQueue = createQueue('sync');
