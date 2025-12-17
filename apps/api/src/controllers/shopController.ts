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
import { prisma } from '../lib/prisma';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';

const createShopSchema = z.object({
  storeUrl: z.string().url(),
});

const updateShopSchema = z.object({
  syncEnabled: z.boolean().optional(),
  sellerName: z.string().optional(),
  sellerUrl: z.string().url().optional(),
  sellerPrivacyPolicy: z.string().url().nullable().optional(),
  sellerTos: z.string().url().nullable().optional(),
  returnPolicy: z.string().nullable().optional(),
  returnWindow: z.number().int().positive().nullable().optional(),
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
      productSyncQueue?.queue.add('product-sync', { shopId: shop.id, type: 'FULL', triggeredBy: 'oauth' }, { removeOnComplete: true });
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

export async function getFieldMappings(req: Request, res: Response) {
  const userId = userIdFromReq(req);
  const { id } = req.params;

  try {
    const shop = await getShopRecord(id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Verify ownership
    if (shop.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Start with default mappings for all 70 OpenAI fields
    const defaultMappings = getDefaultMappings();
    const mappings: Record<string, string | null> = { ...defaultMappings };

    // Query field mappings from database with joins
    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { shopId: id },
      include: {
        openaiField: true,
        wooField: true,
      },
    });

    // Override defaults with database mappings (user customizations)
    for (const mapping of fieldMappings) {
      if (mapping.wooField) {
        // User has mapped this field to a WooCommerce field
        mappings[mapping.openaiField.attribute] = mapping.wooField.value;
      } else {
        // User explicitly unmapped this field (set to null)
        mappings[mapping.openaiField.attribute] = null;
      }
    }

    // Add shop-level toggle defaults (these are NOT field mappings, they're shop settings)
    mappings['enable_search'] = shop.defaultEnableSearch ? 'ENABLED' : 'DISABLED';
    mappings['enable_checkout'] = shop.defaultEnableCheckout ? 'ENABLED' : 'DISABLED';

    logger.info('shops:field-mappings:get', {
      shopId: id,
      userId,
      dbMappings: fieldMappings.length,
      totalFields: Object.keys(mappings).length,
    });

    return res.json({ mappings });
  } catch (err: any) {
    logger.error('shops:field-mappings:get error', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function updateFieldMappings(req: Request, res: Response) {
  const userId = userIdFromReq(req);
  const { id } = req.params;

  try {
    const shop = await getShopRecord(id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Verify ownership
    if (shop.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate: req.body should be { mappings: Record<string, string | null> }
    const { mappings } = req.body as { mappings: Record<string, string | null> };

    if (!mappings || typeof mappings !== 'object') {
      return res.status(400).json({ error: 'Invalid mappings format' });
    }

    // Extract toggle fields - these are shop-level settings, NOT field mappings
    const enableSearch = mappings['enable_search'];
    const enableCheckout = mappings['enable_checkout'];
    delete mappings['enable_search'];
    delete mappings['enable_checkout'];

    // Update shop defaults for toggle fields
    if (enableSearch !== undefined) {
      await prisma.shop.update({
        where: { id },
        data: { defaultEnableSearch: enableSearch === 'ENABLED' },
      });
      logger.info('shops:field-mappings:update toggle', {
        shopId: id,
        field: 'enable_search',
        value: enableSearch,
      });
    }

    if (enableCheckout !== undefined) {
      await prisma.shop.update({
        where: { id },
        data: { defaultEnableCheckout: enableCheckout === 'ENABLED' },
      });
      logger.info('shops:field-mappings:update toggle', {
        shopId: id,
        field: 'enable_checkout',
        value: enableCheckout,
      });
    }

    // Process each mapping
    const results = { created: 0, updated: 0, deleted: 0, errors: 0 };

    for (const [openaiAttribute, wooFieldValue] of Object.entries(mappings)) {
      try {
        // Find the OpenAI field by attribute
        const openaiField = await prisma.openAIField.findUnique({
          where: { attribute: openaiAttribute },
        });

        if (!openaiField) {
          logger.warn(`OpenAI field "${openaiAttribute}" not found, skipping`);
          results.errors++;
          continue;
        }

        // Find the WooCommerce field by value (if not null/ENABLED/DISABLED)
        let wooField = null;
        if (wooFieldValue && wooFieldValue !== 'ENABLED' && wooFieldValue !== 'DISABLED') {
          // Try to find shop-specific field first, then standard field
          wooField = await prisma.wooCommerceField.findFirst({
            where: {
              value: wooFieldValue,
              OR: [
                { shopId: id },    // Shop-specific discovered field
                { shopId: null },  // Standard field
              ],
            },
          });

          if (!wooField) {
            logger.warn(`WooCommerce field "${wooFieldValue}" not found, skipping`);
            results.errors++;
            continue;
          }
        }

        // Check if mapping already exists
        const existing = await prisma.fieldMapping.findUnique({
          where: {
            shopId_openaiFieldId: {
              shopId: id,
              openaiFieldId: openaiField.id,
            },
          },
        });

        if (wooFieldValue === null) {
          // Delete mapping if it exists
          if (existing) {
            await prisma.fieldMapping.delete({
              where: { id: existing.id },
            });
            results.deleted++;
          }
        } else {
          // Upsert mapping
          const result = await prisma.fieldMapping.upsert({
            where: {
              shopId_openaiFieldId: {
                shopId: id,
                openaiFieldId: openaiField.id,
              },
            },
            create: {
              shopId: id,
              openaiFieldId: openaiField.id,
              wooFieldId: wooField?.id || null,
            },
            update: {
              wooFieldId: wooField?.id || null,
            },
          });

          if (existing) {
            results.updated++;
          } else {
            results.created++;
          }
        }
      } catch (mappingErr: any) {
        logger.error(`Error processing mapping for ${openaiAttribute}:`, mappingErr);
        results.errors++;
      }
    }

    logger.info('shops:field-mappings:update', { shopId: id, userId, results });
    return res.json({ success: true, results });
  } catch (err: any) {
    logger.error('shops:field-mappings:update error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Discover custom meta_data fields from shop's WooCommerce products
 * POST /api/v1/shops/:id/discover-fields
 */
export async function discoverWooFields(req: Request, res: Response) {
  const userId = userIdFromReq(req);
  const { id } = req.params;

  try {
    const shop = await getShopRecord(id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Verify ownership
    if (shop.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Trigger field discovery
    logger.info('shops:discover-fields:start', { shopId: id, userId });

    const result = await FieldDiscoveryService.discoverFields(id);

    logger.info('shops:discover-fields:complete', {
      shopId: id,
      userId,
      discovered: result.discovered.length,
      saved: result.saved,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    return res.json({
      success: true,
      discovered: result.discovered.length,
      saved: result.saved,
      skipped: result.skipped,
      errors: result.errors,
      fields: result.discovered,
    });
  } catch (err: any) {
    logger.error('shops:discover-fields error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get all available WooCommerce fields for a shop (standard + discovered)
 * GET /api/v1/shops/:id/woo-fields
 */
export async function getWooFields(req: Request, res: Response) {
  const userId = userIdFromReq(req);
  const { id } = req.params;

  try {
    const shop = await getShopRecord(id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Verify ownership
    if (shop.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get all fields (standard + shop-specific discovered)
    const fields = await FieldDiscoveryService.getShopFields(id);

    logger.info('shops:woo-fields:get', { shopId: id, userId, count: fields.length });

    return res.json({ fields });
  } catch (err: any) {
    logger.error('shops:woo-fields:get error', err);
    return res.status(500).json({ error: err.message });
  }
}
