import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { enrichProduct, storeEmbeddingInQdrant } from '../services/aiEnrichment';
import { logger } from '../lib/logger';

export async function aiEnrichmentProcessor(job: Job) {
  const { productId } = job.data as { productId: string };
  if (!productId) return;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;
  try {
    const result = await enrichProduct(product);
    await prisma.product.update({
      where: { id: productId },
      data: {
        aiEnriched: true,
        aiTitle: result.title,
        aiDescription: result.description,
        aiKeywords: result.keywords,
        aiQAndA: result.qAndA as any,
        aiSuggestedCategory: result.suggestedCategory,
        updatedAt: new Date(),
      },
    });
    await storeEmbeddingInQdrant(productId, `${result.title}\n${result.description}`);
    logger.info(`ai-enrichment complete for product ${productId}`);
  } catch (err) {
    logger.error(`ai-enrichment failed for product ${productId}`, { error: err instanceof Error ? err : new Error(String(err)) });
  }
}
