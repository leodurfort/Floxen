import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export async function getOverview(req: Request, res: Response) {
  const shopId = req.params.id;

  try {
    const totalProducts = await prisma.product.count({ where: { shopId } });

    return res.json({
      totalProducts,
    });
  } catch (err) {
    logger.error('Failed to get analytics overview', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
    });
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
