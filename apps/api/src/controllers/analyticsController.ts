import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export async function getOverview(req: Request, res: Response) {
  const shopId = req.params.id;
  const period = (req.query.period as string) || '30d';

  try {
    const [totalProducts, syncedProducts] = await Promise.all([
      prisma.product.count({ where: { shopId } }),
      prisma.product.count({ where: { shopId, syncStatus: 'COMPLETED' } }),
    ]);

    return res.json({
      period,
      totalProducts,
      syncedProducts,
      enrichedProducts: 0, // AI enrichment removed
      chatgpt: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        traffic: 0,
        revenue: 0,
      },
      changes: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
    });
  } catch (err) {
    logger.error('Failed to get analytics overview', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      period,
    });
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export function getProductAnalytics(req: Request, res: Response) {
  const shopId = req.params.id;
  prisma.product
    .findMany({ where: { shopId }, take: 50 })
    .then((products) => {
      // TODO: Implement real product-level analytics
      // Should fetch actual impression/click data from analytics service
      const top = products.map((p) => ({
        productId: p.id,
        title: p.wooTitle,
        chatgptImpressions: 0,
        chatgptClicks: 0,
      }));
      return res.json({ products: top });
    })
    .catch((err) => {
      logger.error('Failed to get product analytics', {
        error: err,
        shopId,
      });
      res.status(500).json({ error: err.message });
    });
}

export function getTimeline(_req: Request, res: Response) {
  // TODO: Implement real timeline analytics
  // Should fetch actual daily metrics from analytics service
  const days = Array.from({ length: 14 }).map((_, idx) => {
    const date = new Date(Date.now() - idx * 24 * 60 * 60 * 1000);
    return {
      date: date.toISOString().slice(0, 10),
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };
  }).reverse();
  return res.json({ timeline: days });
}
