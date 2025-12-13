import { Request, Response } from 'express';
import { z } from 'zod';
import { JwtUser } from '../middleware/auth';
import { mockStore } from '../services/mockStore';

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
  return user?.sub || 'user_demo';
}

export function listShops(req: Request, res: Response) {
  const shops = mockStore.getShopsForUser(userIdFromReq(req));
  return res.json({ shops });
}

export function createShop(req: Request, res: Response) {
  const parse = createShopSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const userId = userIdFromReq(req);
  const shop = mockStore.createShop(
    userId,
    parse.data.shopName || new URL(parse.data.storeUrl).hostname,
    parse.data.shopCurrency || 'USD',
  );

  // Stub OAuth URL generation
  const authUrl = `${parse.data.storeUrl}/wc-auth/v1/authorize?app_name=ProductSynch&user=${userId}`;
  return res.status(201).json({ shop, authUrl });
}

export function getShop(req: Request, res: Response) {
  const shop = mockStore.getShop(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  return res.json({ shop });
}

export function updateShop(req: Request, res: Response) {
  const parse = updateShopSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const shop = mockStore.updateShop(req.params.id, parse.data);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  return res.json({ shop });
}

export function disconnectShop(req: Request, res: Response) {
  const shop = mockStore.updateShop(req.params.id, { isConnected: false, syncEnabled: false });
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  return res.json({ shop, message: 'Disconnected' });
}

export function oauthCallback(req: Request, res: Response) {
  return res.json({
    message: 'OAuth callback received',
    shopId: req.params.id,
    query: req.query,
  });
}

export function verifyConnection(req: Request, res: Response) {
  const shop = mockStore.getShop(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  return res.json({ shopId: shop.id, verified: true, status: 'connected' });
}

export function configureOpenAI(req: Request, res: Response) {
  const parse = openAiConfigSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const shop = mockStore.updateShop(req.params.id, {
    openaiEnabled: parse.data.openaiEnabled,
  });
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  return res.json({ shop });
}
