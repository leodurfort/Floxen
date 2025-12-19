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
} from '../services/shopService';
import { LOCKED_FIELD_MAPPINGS, LOCKED_FIELD_SET } from '@productsynch/shared';
import { DEFAULT_FIELD_MAPPINGS } from '../config/default-field-mappings';
import { syncQueue } from '../jobs';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';

const TOGGLE_FIELDS = new Set(['enable_search', 'enable_checkout']);
const ALLOWED_MAPPING_ATTRIBUTES = new Set(Object.keys(DEFAULT_FIELD_MAPPINGS));
const LOCKED_ATTRIBUTES = Array.from(LOCKED_FIELD_SET);

const createShopSchema = z.object({
  storeUrl: z.string().url(),
});

const updateShopSchema = z.object({
  syncEnabled: z.boolean().optional(),
  sellerName: z.string().nullable().optional(),
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
      syncQueue?.queue.add('product-sync', { shopId: shop.id, type: 'FULL', triggeredBy: 'oauth' }, { removeOnComplete: true });
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

    // Get default mappings from spec
    const specDefaults = { ...DEFAULT_FIELD_MAPPINGS };

    // Query field mappings from database with joins
    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { shopId: id },
      include: {
        openaiField: true,
        wooField: true,
      },
    });

    // Build user mappings (only explicit selections from database)
    const userMappings: Record<string, string | null> = {};
    for (const mapping of fieldMappings) {
      if (mapping.wooField) {
        // User has mapped this field to a WooCommerce field
        userMappings[mapping.openaiField.attribute] = mapping.wooField.value;
      } else {
        // User explicitly unmapped this field (set to null)
        userMappings[mapping.openaiField.attribute] = null;
      }
    }

    // Build merged mappings (user selections override spec defaults)
    const mappings: Record<string, string | null> = { ...specDefaults };
    for (const [attribute, value] of Object.entries(userMappings)) {
      mappings[attribute] = value;
    }

    // Add shop-level toggle defaults (these are NOT field mappings, they're shop settings)
    mappings['enable_search'] = shop.defaultEnableSearch ? 'ENABLED' : 'DISABLED';
    mappings['enable_checkout'] = shop.defaultEnableCheckout ? 'ENABLED' : 'DISABLED';
    userMappings['enable_search'] = shop.defaultEnableSearch ? 'ENABLED' : 'DISABLED';
    userMappings['enable_checkout'] = shop.defaultEnableCheckout ? 'ENABLED' : 'DISABLED';

    // Force locked mappings to their required values
    for (const [attribute, lockedValue] of Object.entries(LOCKED_FIELD_MAPPINGS)) {
      mappings[attribute] = lockedValue;
      userMappings[attribute] = lockedValue;
    }

    logger.info('shops:field-mappings:get', {
      shopId: id,
      userId,
      dbMappings: fieldMappings.length,
      userMappings: Object.keys(userMappings).length,
      totalFields: Object.keys(mappings).length,
    });

    return res.json({
      mappings,           // Merged: user selections + spec defaults (backward compatible)
      userMappings,       // Only explicit user selections from database
      specDefaults,       // Default mappings from OpenAI spec
    });
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

    const parsedBody = z
      .object({
        mappings: z.record(z.union([z.string().max(255), z.null()])),
      })
      .safeParse(req.body);

    if (!parsedBody.success) {
      logger.warn('shops:field-mappings:update invalid payload', parsedBody.error.flatten());
      return res.status(400).json({ error: parsedBody.error.flatten() });
    }

    // Normalize incoming mappings: trim strings, drop unknown attributes, convert empty to null
    const sanitizedMappings: Record<string, string | null> = {};
    for (const [attribute, rawValue] of Object.entries(parsedBody.data.mappings || {})) {
      if (!ALLOWED_MAPPING_ATTRIBUTES.has(attribute)) {
        logger.warn('shops:field-mappings:update unknown attribute', { attribute, shopId: id });
        continue;
      }

      if (rawValue === null) {
        sanitizedMappings[attribute] = null;
        continue;
      }

      const trimmed = rawValue.trim();
      sanitizedMappings[attribute] = trimmed.length ? trimmed : null;
    }

    // Strip out locked fields - they cannot be customized
    LOCKED_ATTRIBUTES.forEach((attribute) => {
      delete sanitizedMappings[attribute];
    });

    // Extract toggle fields - these are shop-level settings, NOT field mappings
    const enableSearch = sanitizedMappings['enable_search'];
    const enableCheckout = sanitizedMappings['enable_checkout'];
    delete sanitizedMappings['enable_search'];
    delete sanitizedMappings['enable_checkout'];

    // Validate toggle values early
    const invalidToggle =
      (enableSearch !== undefined &&
        enableSearch !== 'ENABLED' &&
        enableSearch !== 'DISABLED') ||
      (enableCheckout !== undefined &&
        enableCheckout !== 'ENABLED' &&
        enableCheckout !== 'DISABLED');

    if (invalidToggle) {
      return res.status(400).json({ error: 'Invalid toggle value' });
    }

    // Update shop defaults for toggle fields
    const toggleUpdates: Record<string, boolean> = {};
    if (enableSearch !== undefined) {
      toggleUpdates.defaultEnableSearch = enableSearch === 'ENABLED';
    }

    if (enableCheckout !== undefined) {
      toggleUpdates.defaultEnableCheckout = enableCheckout === 'ENABLED';
    }

    if (Object.keys(toggleUpdates).length) {
      await prisma.shop.update({
        where: { id },
        data: {
          ...toggleUpdates,
          fieldMappingsUpdatedAt: new Date(),
        },
      });
      logger.info('shops:field-mappings:update toggle', {
        shopId: id,
        ...toggleUpdates,
      });
    }

    // Ensure locked mappings are removed from the database
    if (LOCKED_ATTRIBUTES.length) {
      await prisma.fieldMapping.deleteMany({
        where: {
          shopId: id,
          openaiField: {
            attribute: { in: LOCKED_ATTRIBUTES },
          },
        },
      });
    }

    // Process each mapping
    const results = { created: 0, updated: 0, deleted: 0, errors: 0 };
    const mappingEntries = Object.entries(sanitizedMappings).filter(
      ([attribute]) => !TOGGLE_FIELDS.has(attribute)
    );

    if (!mappingEntries.length) {
      logger.info('shops:field-mappings:update', { shopId: id, userId, results, message: 'No field mappings to process' });
      return res.json({ success: true, results });
    }

    // Preload OpenAI fields and WooCommerce fields to reduce per-iteration queries
    const attributes = mappingEntries.map(([attribute]) => attribute);
    const openaiFields = await prisma.openAIField.findMany({
      where: { attribute: { in: attributes } },
    });
    const openaiFieldByAttribute = new Map(openaiFields.map((field) => [field.attribute, field]));

    const wooFieldValues = Array.from(
      new Set(
        mappingEntries
          .map(([, value]) => value)
          .filter((value): value is string => Boolean(value))
      )
    );

    const wooFields = wooFieldValues.length
      ? await prisma.wooCommerceField.findMany({
          where: {
            value: { in: wooFieldValues },
          },
        })
      : [];

    const wooFieldByValue = new Map<string, (typeof wooFields)[number]>();
    for (const field of wooFields) {
      wooFieldByValue.set(field.value, field);
    }

    const existingMappings = await prisma.fieldMapping.findMany({
      where: { shopId: id },
    });
    const existingByOpenaiId = new Map(existingMappings.map((mapping) => [mapping.openaiFieldId, mapping]));

    for (const [openaiAttribute, wooFieldValue] of mappingEntries) {
      try {
        const openaiField = openaiFieldByAttribute.get(openaiAttribute);
        if (!openaiField) {
          logger.warn(`OpenAI field "${openaiAttribute}" not found, skipping`, { shopId: id });
          results.errors++;
          continue;
        }

        const existing = existingByOpenaiId.get(openaiField.id);
        let wooFieldId: string | null = null;

        if (wooFieldValue !== null) {
          const wooField = wooFieldByValue.get(wooFieldValue);
          if (!wooField) {
            logger.warn(`WooCommerce field "${wooFieldValue}" not found, skipping`, { shopId: id });
            results.errors++;
            continue;
          }
          wooFieldId = wooField.id;
        }

        // Upsert mapping
        await prisma.fieldMapping.upsert({
          where: {
            shopId_openaiFieldId: {
              shopId: id,
              openaiFieldId: openaiField.id,
            },
          },
          create: {
            shopId: id,
            openaiFieldId: openaiField.id,
            wooFieldId,
          },
          update: {
            wooFieldId,
          },
        });

        if (existing) {
          results.updated++;
        } else {
          results.created++;
        }
      } catch (mappingErr: any) {
        logger.error(`Error processing mapping for ${openaiAttribute}:`, mappingErr);
        results.errors++;
      }
    }

    // Update fieldMappingsUpdatedAt if any mappings were changed
    if (results.created > 0 || results.updated > 0 || results.deleted > 0) {
      await prisma.shop.update({
        where: { id },
        data: { fieldMappingsUpdatedAt: new Date() },
      });
      logger.info('shops:field-mappings:updated-at', { shopId: id });
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

/**
 * Test endpoint: Fetch settings directly from WooCommerce API
 * GET /api/v1/shops/:id/test-woo-settings
 */
export async function testWooSettings(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = userIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const shop = await prisma.shop.findFirst({
      where: { id, userId },
    });

    if (!shop || !shop.isConnected) {
      return res.status(404).json({ error: 'Shop not found or not connected' });
    }

    const { createWooClient, fetchStoreSettings } = await import('../services/wooClient');

    const wooClient = createWooClient({
      storeUrl: shop.wooStoreUrl,
      consumerKey: shop.wooConsumerKey!,
      consumerSecret: shop.wooConsumerSecret!,
    });

    // Fetch settings directly from WooCommerce, pass shop URL as fallback
    const settings = await fetchStoreSettings(wooClient, shop.wooStoreUrl);

    if (!settings) {
      return res.status(500).json({ error: 'Failed to fetch settings from WooCommerce' });
    }

    // Also fetch raw API responses for debugging
    const indexResponse = await wooClient.get('');
    const generalResponse = await wooClient.get('settings/general');
    const productsResponse = await wooClient.get('settings/products');

    // Fetch WordPress settings to show store name and URL
    let wpSettings = null;
    try {
      const wpSettingsResponse = await wooClient.get('../wp/v2/settings');
      wpSettings = wpSettingsResponse.data;
    } catch (wpError: any) {
      wpSettings = { error: wpError.message };
    }

    return res.json({
      parsedSettings: settings,
      rawResponses: {
        index: indexResponse.data,
        generalSettings: generalResponse.data,
        productsSettings: productsResponse.data,
        wpSettings: wpSettings,
      },
    });
  } catch (error: any) {
    logger.error('testWooSettings error', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
}
