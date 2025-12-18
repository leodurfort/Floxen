import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export function getOverview(req: Request, res: Response) {
  const shopId = req.params.id;
  const period = (req.query.period as string) || '30d';
  prisma.product
    .findMany({ where: { shopId } })
    .then((products) => {
      const synced = products.filter((p) => p.syncStatus === 'COMPLETED').length;
      const enriched = 0; // AI enrichment removed

      // TODO: Implement real analytics tracking
      // These values should come from an analytics database or external service
      return res.json({
        period,
        totalProducts: products.length,
        syncedProducts: synced,
        enrichedProducts: enriched,
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
    })
    .catch((err) => {
      logger.error('Failed to get analytics overview', {
        error: err,
        shopId,
        period,
      });
      res.status(500).json({ error: err.message });
    });
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
