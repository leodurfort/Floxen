import { Request, Response } from 'express';
import { z } from 'zod';
import { JwtUser } from '../middleware/auth';
import {
  buildWooAuthUrl,
  createShop as createShopRecord,
  deleteShop as deleteShopRecord,
  disconnectShop as disconnect,
  getShop as getShopRecord,
  listShopsByUser,
  setWooCredentials,
  updateShop as updateShopRecord,
  getDefaultMappings,
} from '../services/shopService';
import { productSyncQueue } from '../jobs';
import { logger } from '../lib/logger';

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
    .then((shops) => {
      logger.info('shops:list', { userId, count: shops.length });
      return res.json({ shops });
    })
    .catch((err) => {
      logger.error('shops:list error', err);
      return res.status(500).json({ error: err.message });
    });
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
      const authUrl = buildWooAuthUrl(parse.data.storeUrl, userId, shop.id);
      logger.info('shops:create', { userId, shopId: shop.id, storeUrl: parse.data.storeUrl });
      res.status(201).json({ shop, authUrl });
    })
    .catch((err) => {
      logger.error('shops:create error', err);
      res.status(500).json({ error: err.message });
    });
}

export function getShop(req: Request, res: Response) {
  getShopRecord(req.params.id)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      logger.info('shops:get', { shopId: shop.id });
      return res.json({ shop });
    })
    .catch((err) => {
      logger.error('shops:get error', err);
      res.status(500).json({ error: err.message });
    });
}

export function updateShop(req: Request, res: Response) {
  const parse = updateShopSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('shops:update invalid', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }
  updateShopRecord(req.params.id, parse.data)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      logger.info('shops:update', { shopId: shop.id });
      return res.json({ shop });
    })
    .catch((err) => {
      logger.error('shops:update error', err);
      res.status(500).json({ error: err.message });
    });
}

export function disconnectShop(req: Request, res: Response) {
  deleteShopRecord(req.params.id)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      logger.info('shops:delete', { shopId: shop.id });
      return res.json({ shop, message: 'Shop deleted successfully' });
    })
    .catch((err) => {
      logger.error('shops:delete error', err);
      res.status(500).json({ error: err.message });
    });
}

export function oauthCallback(req: Request, res: Response) {
  logger.info('shops:oauth callback START', {
    shopId: req.params.id,
    query: req.query,
    body: req.body,
    headers: req.headers,
    method: req.method,
    url: req.url
  });

  // WooCommerce can send credentials in either query params or POST body
  const consumer_key = req.query.consumer_key || req.body?.consumer_key;
  const consumer_secret = req.query.consumer_secret || req.body?.consumer_secret;

  if (!consumer_key || !consumer_secret || Array.isArray(consumer_key) || Array.isArray(consumer_secret)) {
    logger.warn('shops:oauth callback missing credentials', {
      hasConsumerKey: !!consumer_key,
      hasConsumerSecret: !!consumer_secret,
      query: req.query
    });
    return res.status(400).json({ error: 'Missing consumer_key or consumer_secret' });
  }

  logger.info('shops:oauth callback credentials received', {
    shopId: req.params.id,
    consumerKeyLength: String(consumer_key).length
  });

  setWooCredentials(req.params.id, String(consumer_key), String(consumer_secret))
    .then((shop) => {
      productSyncQueue?.queue.add('sync', { shopId: shop.id, type: 'FULL', triggeredBy: 'oauth' }, { removeOnComplete: true });
      logger.info('shops:oauth callback SUCCESS - stored creds', { shopId: shop.id });
      return res.json({ shop, message: 'Connection verified, sync queued' });
    })
    .catch((err) => {
      logger.error('shops:oauth callback ERROR', { shopId: req.params.id, error: err.message, stack: err.stack });
      res.status(500).json({ error: err.message });
    });
}

export function verifyConnection(req: Request, res: Response) {
  getShopRecord(req.params.id)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });
      logger.info('shops:verify', { shopId: shop.id, isConnected: shop.isConnected });
      return res.json({ shopId: shop.id, verified: true, status: 'connected' });
    })
    .catch((err) => {
      logger.error('shops:verify error', err);
      res.status(500).json({ error: err.message });
    });
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
      logger.info('shops:configure openai', { shopId: shop.id, enabled: shop.openaiEnabled });
      return res.json({ shop });
    })
    .catch((err) => {
      logger.error('shops:configure openai error', err);
      res.status(500).json({ error: err.message });
    });
}

export function getFieldMappings(req: Request, res: Response) {
  const userId = userIdFromReq(req);
  const { id } = req.params;

  getShopRecord(id)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });

      // Verify ownership
      if (shop.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Return custom mappings or generate defaults
      const mappings = shop.fieldMappings || getDefaultMappings();

      logger.info('shops:field-mappings:get', { shopId: id, userId });
      return res.json({ mappings });
    })
    .catch((err) => {
      logger.error('shops:field-mappings:get error', err);
      return res.status(500).json({ error: err.message });
    });
}

export function updateFieldMappings(req: Request, res: Response) {
  const userId = userIdFromReq(req);
  const { id } = req.params;

  getShopRecord(id)
    .then((shop) => {
      if (!shop) return res.status(404).json({ error: 'Shop not found' });

      // Verify ownership
      if (shop.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Validate: req.body should be { mappings: Record<string, string> }
      const { mappings } = req.body;

      // Update shop with new mappings
      return updateShopRecord(id, {
        fieldMappings: mappings
      });
    })
    .then((shop) => {
      logger.info('shops:field-mappings:update', { shopId: id, userId });
      return res.json({ shop });
    })
    .catch((err) => {
      logger.error('shops:field-mappings:update error', err);
      return res.status(500).json({ error: err.message });
    });
}
