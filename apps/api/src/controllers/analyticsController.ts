import { Request, Response } from 'express';
import { mockStore } from '../services/mockStore';

export function getOverview(req: Request, res: Response) {
  const shopId = req.params.id;
  const products = mockStore.getProducts(shopId);
  const period = (req.query.period as string) || '30d';

  const synced = products.filter((p) => p.syncStatus === 'COMPLETED').length;
  const enriched = products.filter((p) => p.aiEnriched).length;

  return res.json({
    period,
    totalProducts: products.length,
    syncedProducts: synced,
    enrichedProducts: enriched,
    chatgpt: {
      impressions: 15000,
      clicks: 750,
      conversions: 42,
      traffic: 680,
      revenue: 4500.0,
    },
    changes: {
      impressions: 12.5,
      clicks: 8.3,
      conversions: 15.2,
    },
  });
}

export function getProductAnalytics(req: Request, res: Response) {
  const products = mockStore.getProducts(req.params.id);
  const top = products.map((p) => ({
    productId: p.id,
    title: p.wooTitle,
    chatgptImpressions: Math.floor(Math.random() * 1000),
    chatgptClicks: Math.floor(Math.random() * 200),
  }));
  return res.json({ products: top });
}

export function getTimeline(req: Request, res: Response) {
  const days = Array.from({ length: 14 }).map((_, idx) => {
    const date = new Date(Date.now() - idx * 24 * 60 * 60 * 1000);
    return {
      date: date.toISOString().slice(0, 10),
      impressions: Math.floor(500 + Math.random() * 500),
      clicks: Math.floor(20 + Math.random() * 80),
      conversions: Math.floor(1 + Math.random() * 10),
    };
  }).reverse();
  return res.json({ timeline: days });
}
