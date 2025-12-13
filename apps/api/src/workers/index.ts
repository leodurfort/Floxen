import { createWorker } from '../lib/redis';
import { productSyncProcessor } from './productSyncWorker';
import { aiEnrichmentProcessor } from './aiEnrichmentWorker';
import { feedGenerationProcessor } from './feedGenerationWorker';

createWorker('product-sync', productSyncProcessor);
createWorker('ai-enrichment', aiEnrichmentProcessor);
createWorker('feed-generation', feedGenerationProcessor);
