import { Request, Response } from 'express';
import { z } from 'zod';
import { JwtUser } from '../middleware/auth';
import {
  buildWooAuthUrl,
  createShop as createShopRecord,
  disconnectShop as disconnect,
  getShop as getShopRecord,
  listShopsByUser,
  updateShop as updateShopRecord,
} from '../services/shopService';

const createShopSchema = z.object({
  storeUrl: z.string().url(),
  shopName: z.string().optional(),
  shopCurrency: z.string().optional(),
});

const updateShopSchema = z.object({
  shopName: z.string().optional(),
  shopCurrency: z.string().optional(),
  syncEnabled: z.boolean().optional(),
});

const openAiConfigSchema = z.object({
  openaiEnabled: z.boolean(),
  openaiEndpoint: z.string().url().optional(),
  openaiMerchantId: z.string().optional(),
});

function userIdFromReq(req: Request): string {
  const user = (req as Request & { user?: JwtUser }).user;
  return user?.sub || '';
}

export function listShops(req: Request, res: Response) {
  const userId = userIdFromReq(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  listShopsByUser(userId)
    .then((shops) => res.json({ shops }))
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function createShop(req: Request, res: Response) {
  const parse = createShopSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const userId = userIdFromReq(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  createShopRecord({
    userId,
    storeUrl: parse.data.storeUrl,
    shopName: parse.data.shopName,
    shopCurrency: parse.data.shopCurrency,
  })
    .then((shop) => {
      const authUrl = buildWooAuthUrl(parse.data.storeUrl, userId);
      res.status(201).json({ shop, authUrl });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function getShop(req: Request, res: Response) {
  getShopRecord(req.params.id)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      return res.json({ shop });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function updateShop(req: Request, res: Response) {
  const parse = updateShopSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }
  updateShopRecord(req.params.id, parse.data)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      return res.json({ shop });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function disconnectShop(req: Request, res: Response) {
  disconnect(req.params.id)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      return res.json({ shop, message: 'Disconnected' });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function oauthCallback(req: Request, res: Response) {
  return res.json({
    message: 'OAuth callback received',
    shopId: req.params.id,
    query: req.query,
  });
}

export function verifyConnection(req: Request, res: Response) {
  getShopRecord(req.params.id)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      return res.json({ shopId: shop.id, verified: true, status: 'connected' });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function configureOpenAI(req: Request, res: Response) {
  const parse = openAiConfigSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }
  updateShopRecord(req.params.id, {
    openaiEnabled: parse.data.openaiEnabled,
    openaiEndpoint: parse.data.openaiEndpoint,
    openaiMerchantId: parse.data.openaiMerchantId,
  })
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      return res.json({ shop });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}
